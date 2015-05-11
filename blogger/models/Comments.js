let mongoose = require('mongoose');

let CommentSchema = new mongoose.Schema({
  body: String,
  upvotes: {type: Number, default: 0},
  post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'},
  author: String,
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now}
});

CommentSchema.methods.upvote = function (cb) {
  this.upvotes += 1;
  this.save(cb);
};

CommentSchema.methods.update = function (comment,cb) {
  if(this.body !== comment.body)
  {
    this.body=comment.body;
    this.updated = new Date();
    this.save(cb);
  }
};

mongoose.model('Comment', CommentSchema);