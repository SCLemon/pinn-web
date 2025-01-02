const mongoose = require('mongoose');

const newTopicSchema = new mongoose.Schema({
    token:String,
    list:[
        {
            uuid:String,
            date:String,
            name:String,
            data:String
        }
    ]
});

const newTopicModel = mongoose.model('newTopic', newTopicSchema);

module.exports = newTopicModel;

