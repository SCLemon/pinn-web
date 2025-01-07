const {format} = require('date-fns')
const newTopicModel = require('../models/newTopicModel');

const express = require('express');
const router = express.Router();

// 查詢全部專案
router.get('/run/newTopic/find/:token',(req, res) => {
  const token = req.params['token'];
  newTopicModel.findOne({token:token})
  .then((data,err)=>{
    res.send(data);
  })
  .catch(e=>{
    res.send('error')
  })
});

// 查詢專案參數
router.get('/run/newTopic/findProject/:uuid',(req, res) => {
  const token = req.headers['token'];
  const uuid = req.params['uuid']
  newTopicModel.findOne({token:token})
  .then((data,err)=>{
    const output = data.list.filter((obj)=>obj.uuid == uuid)[0]
    res.send(output);
  })
  .catch(e=>{
    res.send('error')
  })
});

// 新增或修改專案
router.post('/run/newTopic/add', (req, res) => {
  const token = req.headers['token'];
  const uuid = req.body.uuid;
  const data = req.body.data;
  const name = req.body.name.trim()!=''? req.body.name : 'unknown';
  const currentDate = format(new Date(),'yyyy-MM-dd HH:mm:ss');

  newTopicModel.findOne({ token: token, 'list.uuid': uuid })
  .then((result) => {
    if (!result) {
      newTopicModel.findOneAndUpdate(
        { token: token },
        { $push: { list: { uuid: uuid, name:name, date: currentDate, data: JSON.stringify(data) }}},
        { upsert: true }
      ).then((r,e)=>{
        res.send('success');
      }).catch(e=>{
        res.send('error');
      });
    } 
    else {
      newTopicModel.findOneAndUpdate(
        { token: token, 'list.uuid': uuid },
        { $set: { 'list.$.data': JSON.stringify(data), 'list.$.date': currentDate }}
      ).then((r,e)=>{
        res.send('success');
      }).catch(e=>{
        res.send('error');
      });
    }
  })
});

// 刪除專案
router.delete('/run/newTopic/delete/:uuid',(req, res) => {
  const uuid = req.params.uuid;
  newTopicModel.findOneAndUpdate(
    { token: req.headers['token'], 'list.uuid': uuid },
    { $pull: { list: { uuid: uuid } } },
    { new: true }
  ).then(result => {
    if (result) {
      res.send('刪除成功');
    } else {
      res.send('未找到匹配的資料');
    }
  }).catch(err => {
    console.log(err);
    res.send('刪除失敗');
  });
});


// 文件處理區塊
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); // 設定最大上傳大小為 50MB
const stlModel = require('../models/stlModel');
const { GridFSBucket } = require('mongodb');
const { getDb } = require('../db/db')

// 新增或修改文件
router.post('/run/newTopic/addFiles/:uuid', upload.array('files[]'), (req, res) => {
  const bucket = new GridFSBucket(getDb(), { bucketName: 'stlFiles' });
  var token = req.headers['token'];
  var uuid = req.params.uuid;

  stlModel.findOne({ token: token, uuid: uuid })
  .then((data) => {
    if (data && data.fieldIds && data.fieldIds.length !== 0){
      const fieldIds = data.fieldIds;
      var deletePromise = fieldIds.map((fileId) => {
        return new Promise((resolve, reject) => {
          bucket.delete(fileId, (err) => {})
          .catch((e)=>{}).finally(()=>{resolve()});
        });
      });
  
      Promise.all(deletePromise)
      .then(()=>{
        saveFiles(req,res)
      })
    }
    else saveFiles(req,res)
  });
});

// 儲存文件
function saveFiles(req,res){
  const bucket = new GridFSBucket(getDb(), { bucketName: 'stlFiles' });
  var token = req.headers['token'];
  var uuid = req.params.uuid;

  if (!req.files || req.files.length === 0) {
    return stlModel.findOneAndReplace(
      { token: token, uuid: uuid },
      { token:token, uuid:uuid, fieldIds:[] },
      { upsert: true}
    ).then((data) => {return res.send({type: 'success',message: 'Files Saved Successfully'});})
    .catch((err) => {return res.send({type: 'error',message: 'Failed to Save File IDs' });});
  }

  const filePromises = req.files.map((file) => {
    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
      });
      uploadStream.end(file.buffer);
      uploadStream.on('finish', () => {
        resolve({
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          size: file.size,
          fileId: uploadStream.id,
        });
      });

      uploadStream.on('error', (err) => {
        reject(err);
      });
    });
  });
  
  Promise.all(filePromises)
  .then((files) => {
    var output = files.map(item=>item.fileId);
    stlModel.findOneAndReplace(
      { token: token, uuid: uuid },
      { token:token, uuid:uuid, fieldIds:output },
      { upsert: true}
    )
    .then((data) => {
      return res.send({
        type: 'success',
        message: 'Files Saved Successfully',
      });
    })
    .catch((err) => {
      return res.send({
        type: 'error',
        message: 'Failed to Save File IDs'
      });
    });
  })
}


// 查詢文件
router.get('/run/newTopic/getFiles/:uuid', (req, res) => {
  const token = req.headers['token'];
  const uuid = req.params.uuid;

  stlModel.findOne({ token: token, uuid: uuid })
  .then((data) => {
    if (!data || !data.fieldIds || data.fieldIds.length === 0) return res.send([])
    const fieldIds = data.fieldIds;
    const bucket = new GridFSBucket(getDb(), { bucketName: 'stlFiles' });
    const filePromises = fieldIds.map((fieldId) => {
      return new Promise((resolve, reject) => {
        const downloadStream = bucket.openDownloadStream(fieldId);
        const chunks = [];
        let fileMetadata = {};
        downloadStream.on('file', (file) => {
          fileMetadata = {
            fieldId,
            filename: file.filename,
            contentType: file.contentType,
            size: file.length,
          };
        });
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        downloadStream.on('end', () => {
          const fileBuffer = Buffer.concat(chunks);
          resolve({
            ...fileMetadata,
            file: fileBuffer,
          });
        });
        downloadStream.on('error', (err) => {reject(err);});
      });
    });
    Promise.all(filePromises)
    .then((files) => {
      res.set('Content-Type', 'application/json');
      res.send({
        type: 'success',
        message: 'Files fetched successfully',
        files,
      });
    })
    .catch((err) => {return res.send({type: 'error',message: 'Failed to fetch files'});});
  })
  .catch((err) => {return res.send({type: 'error',message: 'Failed to find file IDs in database'});});
});

module.exports = router;