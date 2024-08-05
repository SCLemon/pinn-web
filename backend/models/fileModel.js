//导入 mongoose
const mongoose = require('mongoose');

// 创建文档结构
const fileSchema = new mongoose.Schema({
    token:String,
    uuid:String,
    status:String,
    name:String,
    date:String,
    inputRoute:String,
    outputName:String,
    outputRoute:String,
});

//创建模型对象
const fileModel = mongoose.model('files', fileSchema);

//暴露
module.exports = fileModel;