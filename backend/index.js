const express = require('express');
const app = express();
const util = require('util');
const exec = util.promisify(require('child_process').exec);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`訪問路徑: ${req.path}`);
    next();
});

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


app.use(router)
app.listen(3999,()=>{
    console.log('server is running on port 3999')
})