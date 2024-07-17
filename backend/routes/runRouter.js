const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');
const { ObjectId } = mongoose.Types;
const { format } =require('date-fns');
const multer = require('multer');
const { getDb } = require('../db/db');
// Step 1. 建構 python 程式碼
router.post('/run/code',(req, res) => {
    console.log(req.body.data) // 獲取整體程式碼
    res.send('success');
});

// Step 2. 執行 python module
router.post('/run/module',(req, res) => {
    console.log(req.body.data) // 獲取配置參數
    res.send('success');
});


// Step 3. 空殼資料建立(之後需改為 function()) <-- 從 Step 2. 呼叫此方法
const upload = multer();
router.post('/run/upload',upload.single('file'),(req, res) => {
    var file = req.file;
    var filename = req.body.filename
    var token = req.headers['user-token'];
    const db = getDb();
    const bucket = new GridFSBucket(db);
    try {
        // 空殼資料
        const readableStream = new Readable();
        readableStream.push(null); // 結束流
        const uploadStream = bucket.openUploadStream(`${format(new Date(), 'MMdd')}_project`,{
            metadata: {token: token, date:format(new Date(),'yyyy-MM-dd'),status:'Queuing',output:''}
        });
        readableStream.pipe(uploadStream);
        uploadStream.on('finish', () => {
            res.status(200).send({message: '資料儲存成功'});
        });

        setTimeout(() => { // 模擬改變狀態 <-- 理當在 python 執行過程運行
            updateFileStatus(uploadStream.id.toHexString(),'Running')
            setTimeout(()=>{
                replaceFile(file,{
                    id:uploadStream.id,
                    filename:filename,
                    metadata:uploadStream.options.metadata
                }) // 取代空殼
            },5000)
        }, 5000);
    } catch (err) {
        res.status(200).send({ message: '伺服器錯誤' });
    }
});

// Step 4. 修改狀態 Running or Ready  <-- 在 module 運行過程中改變狀態用
async function updateFileStatus(idx,status){
    const newMetadata = status==undefined?'Ready':status;
    const db = getDb();
    try {
        const filesCollection = db.collection('fs.files');
        const result = await filesCollection.updateOne(
            { _id: new ObjectId(idx) },
            { $set: { "metadata.status": newMetadata } }
        );
    } catch (err) {}
};

// Step 5. 取代檔案 <--  在生成 VTP 檔案後需要取代原本的空殼
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
        const upload = bucket.openUploadStream(`${format(new Date(), 'MMdd')}_project`,{
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