const { v4: uuidv4 } = require('uuid');
const userModel = require('../models/userModel');

const express = require('express');
const router = express.Router();

// 驗證
router.post('/verify/register',(req, res) => {
  var mail = req.body.mail;
  var password = req.body.password;
  if(!new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/).test(mail)) return res.status(200).send('電子信箱格式錯誤');
  else if(mail.trim()==''||password.trim()=='') return res.status(200).send('輸入資料不可空白');
  else{
    req.body.token = uuidv4();
    userModel.findOne({mail:mail})
    .then((data,err)=>{
      if(!data){
        // 創建新帳號
        userModel.create(req.body)
        .then((data, err) => {
          if (err) res.status(200).send('帳號創建失敗')
          else {
            res.status(200).send({
              status:'success',
              message:'帳號創建成功',
              token:data.token
            })
          }
        })
      }
      else{
        // 驗證登入
        if(password == data.password){
          res.status(200).send({
            status:'success',
            message:'登入成功',
            token:data.token
          })
        }
        else res.status(200).send('帳號或密碼錯誤');
      }
    })
    .catch(e=>{
      res.status(200).send('帳號創建失敗');
    })
  }
});

module.exports = router;