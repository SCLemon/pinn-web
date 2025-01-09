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

const fs = require('fs');
const path = require('path');

const relativePath = '../../../pinns/uploads';

// 新增或修改文件
router.post('/run/newTopic/addFiles/:uuid', upload.array('files[]'), (req, res) => {
  try{
    const token = req.headers.token;
    const uuid = req.params.uuid;
    const targetDir = path.join(__dirname, relativePath ,token, uuid);
    if (fs.existsSync(targetDir)) { // 若已存在資料則先清除所有檔案
      const files = fs.readdirSync(targetDir);
      files.forEach(file => {
        const filePath = path.join(targetDir, file);
        fs.unlinkSync(filePath);
      });
    } 
    else fs.mkdirSync(targetDir, { recursive: true });

    const files = req.files;
    files.forEach(file => {
      const filePath = path.join(targetDir, file.originalname);
      fs.writeFileSync(filePath, file.buffer);
    });
    res.send({status:'success',message:'STL文件儲存成功！'});
  }
  catch(e){
    res.send({status:'error',message:'STL文件儲存失敗！'});
  }
});

// 查詢文件
const archiver = require('archiver');
router.get('/run/newTopic/getFiles/:uuid', (req, res) => {
  try{
    const token = req.headers.token; // 获取 token
    const uuid = req.params.uuid;   // 获取 uuid
    const targetDir = path.join(__dirname, relativePath, token, uuid);
  
    fs.readdir(targetDir, (err, files) => {
      const zip = archiver('zip', {zlib: { level: 9 }});

      res.attachment('files.zip');
      zip.pipe(res);

      files.forEach(file => {
        const filePath = path.join(targetDir, file);
        zip.file(filePath, { name: file });
      });

      zip.finalize();
    });
  }
  catch(e){
    res.send({
      status: 'error',
      message:'Failed To Retrieved Files'
    });
  }
});

// 刪除資料
router.delete('/run/newTopic/deleteAllFiles/:uuid',(req,res)=>{
  const token = req.headers.token;
  const uuid = req.params.uuid;
  const targetDir = path.join(__dirname, relativePath ,token, uuid);
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    files.forEach(file => {
      const filePath = path.join(targetDir, file);
      fs.unlinkSync(filePath);
    });
    fs.rmdirSync(targetDir);
  }
  res.send('success')
})

module.exports = router;