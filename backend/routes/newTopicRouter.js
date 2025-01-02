const {format} = require('date-fns')
const newTopicModel = require('../models/newTopicModel');

const express = require('express');
const router = express.Router();

// 查詢全部
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

// 查詢專案
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

// 新增或修改
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

// 刪除
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

module.exports = router;