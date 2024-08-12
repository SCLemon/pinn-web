const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    token:String,
    uuid:String,
    status:String,
    name:String,
    date:String,
    inputRoute:String,
    outputName:String,
    outputRoute:String,
    done:Boolean,
});

const fileModel = mongoose.model('files', fileSchema);

module.exports = fileModel;

