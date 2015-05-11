let mongoose = require('mongoose');

let PostSchema = new mongoose.Schema({
  title: String,
  content: String,
  upvotes: {type: Number, default: 0},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
  images: [{type: mongoose.Schema.Types.ObjectId, ref: 'Image'}],
  author: String,
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now}
});

PostSchema.methods.upvote = function (cb) {
  this.upvotes += 1;
  this.save(cb);
};

PostSchema.methods.update = function (post,cb) {
  var isChanged = false;
  console.dir(post);
  if(this.title !== post.title)
  {
    this.title=post.title;
    isChanged = true;
  }
  if(this.content !== post.content)
  {
    this.content=post.content;
    isChanged = true;
  }
  if(isChanged){
    this.updated = new Date();
    this.save(cb);
  }
};

mongoose.model('Post', PostSchema);