let mongoose = require('mongoose');

let ImageSchema = new mongoose.Schema({
  originalname: String,
  name: String,
  path: String,
  mimetype: String,
  extension: String,
  encoding: String,
  size: Number,
  post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'},
  created: {type: Date, default: Date.now}
});


mongoose.model('Image', ImageSchema);