const mongoose = require('mongoose');

const stlSchema = new mongoose.Schema({
    token: String,
    uuid: String,
    fieldIds: [mongoose.Schema.Types.ObjectId],
});

const stlModel = mongoose.model('stlFiles', stlSchema);

module.exports = stlModel;

