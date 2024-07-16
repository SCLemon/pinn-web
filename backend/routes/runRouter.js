const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');
const { ObjectId } = mongoose.Types;
const { format } =require('date-fns');
const multer = require('multer');
const { getDb } = require('../db/db');

// 回傳程式碼
router.post('/run/code',(req, res) => {
    console.log(req.body.data) // 獲取整體程式碼
    res.send('success');
});

// 執行 module
router.post('/run/module',(req, res) => {
    console.log(req.body.data) // 獲取配置參數
    res.send('success');
});


// 上傳檔案
const upload = multer();
router.post('/run/upload',upload.single('file'),(req, res) => {
    var file = req.file;
    var token = req.headers['user-token'];
    const db = getDb();
    const bucket = new GridFSBucket(db);
    try {
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null); // 結束流
        const uploadStream = bucket.openUploadStream(`${format(new Date(),'MMdd')}_${file.originalname}`,{
            metadata: {token: token, date:format(new Date(),'yyyy-MM-dd'),status:'Queuing'}
        });
        readableStream.pipe(uploadStream);
        uploadStream.on('finish', () => {
            res.status(200).send({message: '資料儲存成功'});
        });
        setTimeout(() => { // 模擬改變狀態
            updateFileStatus(uploadStream.id.toHexString())
        }, 5000);
    } catch (err) {
        console.error(err);
        res.status(200).send({ message: '伺服器錯誤' });
    }
});

// 下載檔案
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

// 查看檔案
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
                status:obj.metadata.status
            }
        })
        res.status(200).send(files);
    } catch (err) {
        res.status(200).send({ message: '伺服器錯誤' });
    }
});

// 刪除檔案
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


// 修改狀態
async function updateFileStatus(idx){
    const newMetadata = 'Ready';
    const db = getDb();
    try {
        const filesCollection = db.collection('fs.files');
        const result = await filesCollection.updateOne(
            { _id: new ObjectId(idx) },
            { $set: { "metadata.status": newMetadata } }
        );
    } catch (err) {}
};
module.exports = router;