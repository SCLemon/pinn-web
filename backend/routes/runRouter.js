const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');
const { ObjectId } = mongoose.Types;
const { format } =require('date-fns');
const multer = require('multer');
const { getDb } = require('../db/db');

const { exec } = require('child_process'); // 執行 shell
const fs = require('fs');
const os = require('os');
const path = require('path');

let queue = []; // 佇列
let isRunning = false; // 檢查是否在運行計算

// Step 1. 建構 python 程式碼
router.post('/run/code',(req, res) => {
    try{
        const tempFilePath = path.join(os.tmpdir(), 'temp.json');
        const pyFilePath = path.join(__dirname, 'parser/json_parser.py');
    
        // 擷取資料並寫入臨時文件
        const jsonObject = req.body.json;
        fs.writeFileSync(tempFilePath, jsonObject, 'utf8');
    
        // 執行 Python 腳本，並傳遞臨時文件的路徑
        exec(`python ${pyFilePath} ${tempFilePath}`, (error, stdout, stderr) => {
            // 刪除臨時文件
            fs.unlinkSync(tempFilePath);
            console.log(stderr)
            res.send('```\n'+`${stdout}`+'\n```');
        });
    }
    catch(e){
        res.send('```\n'+`${stdout}`+'\n```');
    }
});

// Step 2. 資料建立 <-- 以 File 形式傳至後端
const upload = multer();
router.post('/run/upload',upload.single('file'),(req, res) => {
    var file = req.file;
    var filename = req.body.filename
    var token = req.headers['user-token'];
    const db = getDb();
    const bucket = new GridFSBucket(db);
    try {
        // 放入資料庫
        const readableStream = new Readable();
        readableStream.push(file.buffer); // 輸入 python 文件內容
        readableStream.push(null); // 結束流
        const uploadStream = bucket.openUploadStream(`${format(new Date(), 'hhmm')}_project`,{
            metadata: {token: token, date:format(new Date(),'yyyy-MM-dd'),status:'Queuing',output:''}
        });
        readableStream.pipe(uploadStream);
        uploadStream.on('finish', () => {
            queue.push({ // 添加至佇列
                id:uploadStream.id,
                filename:filename,
                metadata:uploadStream.options.metadata
            })
            if(!isRunning) runModule() // 佇列在運行時，不需再次執行 module
            res.status(200).send('資料儲存成功');
        });

    } catch (err) {
        res.status(200).send('伺服器錯誤');
    }
});

// Step 3. 執行 python module
function runModule(){
    if(queue.length == 0){
        isRunning = false;
        return;
    }
    isRunning = true;
    // step 1. 獲取佇列中首位;
    var target = queue[0];

    // step 2. 連接資料庫
    const db = getDb();
    const bucket = new GridFSBucket(db);

    // Step 3. 讀取資料庫內容並創建臨時 python
    const tempFilePath = path.join(__dirname, 'temp_python_file.py');
    const downloadStream = bucket.openDownloadStream(new ObjectId(target.id));
    const writeStream = fs.createWriteStream(tempFilePath);
    downloadStream.pipe(writeStream);
    downloadStream.on('end', () => {
        // 執行 python 檔
        updateFileStatus(target.id,'Running');
        exec(`python ${tempFilePath}`, (error, stdout, stderr) => {
            try{
                // 讀取輸出檔案
                var file;

                // 取代資料庫檔案
                replaceFile(file,{ // file 指的是 python 輸出後的文件內容 <-- 需要抓資料
                    id:target.id,
                    filename:target.filename,
                    metadata:target.metadata
                }) 
                // 刪除臨時文件
                fs.unlink(tempFilePath, (err) => {
                    if (err) {
                        console.error('Error deleting temp file:', err);
                    }
                });
            }
            catch(e){ console.log(e) }
            finally{
                queue.pop(); // 刪除已完成的佇列對象。
                runModule(); // 遞迴
            }
            
        });
    });
}

// Step 4. 修改狀態 Running or Ready  <-- 在 module 運行過程中改變狀態用
async function updateFileStatus(idx,status){
    const newMetadata = status;
    const db = getDb();
    try {
        const filesCollection = db.collection('fs.files');
        const result = await filesCollection.updateOne(
            { _id: new ObjectId(idx) },
            { $set: { "metadata.status": newMetadata } }
        );
    } catch (err) {}
};

// Step 5. 取代檔案 <--  在生成 VTP 檔案後需要取代原本的資料
async function replaceFile(file,options) {
    const db = getDb();
    const bucket = new GridFSBucket(db);
    try {
        // 先刪除目標文件
        await bucket.delete(options.id);
        // 取代文件
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null); 
        options.metadata.output = options.filename;
        options.metadata.status = 'Ready';
        const upload = bucket.openUploadStream(`${format(new Date(), 'hhmm')}_project`,{
            metadata: options.metadata
        });
        readableStream.pipe(upload);

    } catch (error) {
        console.error('Error replacing file:', error);
    }
}

// 下載檔案 --> 無需更改
router.get('/run/download/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    const db = getDb();
    const bucket = new GridFSBucket(db);
    try {
        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
        downloadStream.on('data', (chunk) => {
            res.write(chunk);
        });

        downloadStream.on('error', (err) => {
            res.status(200).send('下載失敗');
        });

        downloadStream.on('end', () => {
            res.end();
        });
    } catch (err) {
        res.status(200).send({ message: '伺服器錯誤' });
    }
});

// 查看檔案 --> 無需更改
router.get('/run/findAll', async (req, res) => {
    var token = req.headers['user-token'];
    const db = getDb();
    try {
        var files = await db.collection('fs.files').find({}).toArray();
        files = files.map(obj=>{
            return{
                id: obj._id.toHexString(),
                date:obj.metadata.date,
                filename:obj.filename,
                status:obj.metadata.status,
                output:obj.metadata.output
            }
        })
        res.status(200).send(files);
    } catch (err) {
        res.status(200).send({ message: '伺服器錯誤' });
    }
});

// 刪除檔案 --> 無需更改
router.delete('/run/delete/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    const db = getDb();
    const bucket = new GridFSBucket(db);
    try {
        await bucket.delete(new ObjectId(fileId));
        res.status(200).send('檔案刪除成功');
    } catch (err) {
        res.status(200).send('檔案刪除失敗');
    }
});

module.exports = router;