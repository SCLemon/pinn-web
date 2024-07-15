const express = require('express');
const router = express.Router();

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

module.exports = router;