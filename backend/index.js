const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化資料庫
const { connectToDatabase, disconnectFromDatabase } = require('./db/db');
connectToDatabase();
process.on('SIGINT', function() {
    disconnectFromDatabase();
    // 這裡可以進行其他的清理操作，例如關閉伺服器
    process.exit(0);
});

// run router
const runRouter = require('./routes/runRouter');
app.use(runRouter);

// verify router
const verifyRouter = require('./routes/verifyRouter');
app.use(verifyRouter);

// newTopic router
const newTopicRouter = require('./routes/newTopicRouter');
app.use(newTopicRouter);

app.listen(3999,()=>{
    console.log('server is running on port 3999')
})

// 避免系統中斷
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});