let jwt = require('express-jwt');
let mongoose = require('mongoose');
let Post = mongoose.model('Post');
let Comment = mongoose.model('Comment');
let User = mongoose.model('User');
let passport = require('passport');
let auth = jwt({secret: 'SECRET', userProperty: 'payload'});

module.exports = (app) => {

  app.get('/posts', function (req, res, next) {
    Post.find(function (err, posts) {
      if (err) {
        return next(err);
      }

      res.json(posts);
    });
  });

  app.post('/posts', auth, function (req, res, next) {
    let post = new Post(req.body);
    post.author = req.payload.username;
    post.save(function (err, post) {
      if (err) {
        return next(err);
      }

      res.json(post);
    });
  });

  app.param('post', function (req, res, next, id) {

    var query = Post.findById(id);

    query.exec(function (err, post) {
      if (err) {
        return next(err);
      }
      if (!post) {
        return next(new Error('can\'t find post'));
      }

      req.post = post;
      return next();
    });
  });

  app.get('/posts/:post', function (req, res, next) {
    req.post.populate('comments', function (err, post) {
      if (err) {
        return next(err);
      }

      res.json(post);
    });
  });

  app.put('/posts/:post/upvote', auth, function (req, res, next) {
    req.post.upvote(function (err, post) {
      if (err) {
        return next(err);
      }

      res.json(post);
    });
  });

  app.post('/posts/:post/comments', auth, function (req, res, next) {
    let comment = new Comment(req.body);
    comment.post = req.post;
    comment.author = req.payload.username;

    comment.save(function (err, comment) {
      if (err) {
        return next(err);
      }

      req.post.comments.push(comment);
      req.post.save(function (err, post) {
        if (err) {
          return next(err);
        }

        res.json(comment);
      });
    });
  });
  app.param('comment', function (req, res, next, id) {

    var query = Comment.findById(id);

    query.exec(function (err, comment) {
      if (err) {
        return next(err);
      }
      if (!comment) {
        return next(new Error('can\'t find Comment'));
      }

      req.comment = comment;
      return next();
    });
  });

  app.put('/posts/:post/comments/:comment/upvote', auth, function (req, res, next) {
    req.comment.upvote(function (err, post) {
      if (err) {
        return next(err);
      }

      res.json(post);
    });
  });

  app.post('/register', function(req, res, next){
    if(!req.body.username || !req.body.password){
      return res.status(400).json({message: 'Please fill out all fields'});
    }
    console.dir(req);
    var user = new User();

    user.username = req.body.username;

    user.password = user.generateHash(req.body.password);

    user.save(function (err){
      if(err){ return next(err); }

      return res.json({token: user.generateJWT()})
    });
  });

  app.post('/login', function(req, res, next){
    if(!req.body.username || !req.body.password){
      return res.status(400).json({message: 'Please fill out all fields'});
    }

    passport.authenticate('local', function(err, user, info){
      if(err){ return next(err); }

      if(user){
        return res.json({token: user.generateJWT()});
      } else {
        return res.status(401).json(info);
      }
    })(req, res, next);
  });

};