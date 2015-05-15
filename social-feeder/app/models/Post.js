let mongoose = require('mongoose');

let PostSchema = mongoose.Schema({
  key: Number,
  network: Object,
  text: String,
  image: String,
  liked: Boolean,
  id: String,
  username: String,
  created_time: {type: Date, default: Date.now},
  status: {type: String, enum: ['published', 'deleted'], default: 'published'},
  updated: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Post', PostSchema);
