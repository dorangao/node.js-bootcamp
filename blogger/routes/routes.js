let mongoose = require('mongoose');
let Post = mongoose.model('Post');
let Comment = mongoose.model('Comment');
let User = mongoose.model('User');
let Image = mongoose.model('Image');
let passport = require('passport');
let jwt = require('express-jwt');
let auth = jwt({secret: 'SECRET'});
let multer = require('multer');


require('songbird');

module.exports = (app) => {

  app.get('/users', function (req, res, next) {
    let params = {};
    User.find(params, function (err, users) {
      if (err) {
        return next(err);
      }
      res.json(users);
    });
  });


  app.get('/posts', function (req, res, next) {
    let username = req.query.username;
    let params = {};
    if (username)
      params.author = username;
    Post.find(params, function (err, posts) {
      if (err) {
        return next(err);
      }
      res.json(posts);
    });
  });

  app.post('/posts', auth, function (req, res, next) {
    let post = new Post(req.body);
    post.author = req.user.username;
    post.save(function (err, post) {
      if (err) {
        return next(err);
      }

      res.json(post);
    });
  });


  app.param('post', function (req, res, next, id) {

    let query = Post.findById(id);

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

  app.post('/posts/:post/images', auth, function (req, res, next) {
    let handler =
      multer({
        dest: './public/uploads/' + req.post._id,
        rename: function (fieldname, filename) {
          return filename.replace(/\W+/g, '-').toLowerCase() + Date.now()
        },
        onFileUploadComplete: function (file, req, res) {
          console.dir(file);
          console.log(file.fieldname + ' uploaded to  ' + file.path);

          let image = new Image();
          image.post = req.post;
          image.originalname = file.originalname;
          image.name = file.name;
          image.encoding = file.encoding;
          image.mimetype = file.mimetype;
          image.path = file.path.slice(7);
          image.extentsion = file.extension;
          image.size = file.size;
          image.save(function (err, image) {
            if (err) {
              return next(err);
            }
            req.post.images.push(image);
            req.post.save(function (err, post) {
              if (err) {
                return next(err);
              }

              res.json(post);
            });
          })
        }
      });

    handler(req, res, ()=> {
    });

  });


  app.get('/posts/:post', function (req, res, next) {
    req.post.populate('comments', function (err, post) {
      if (err) {
        return next(err);
      }
      post.populate('images', function (err, post) {
        if (err) {
          return next(err);
        }
        res.json(post);
      })

    });
  });

  app.put('/posts/:post', function (req, res, next) {
    req.post.update(req.body, function (err, post) {
      if (err) {
        return next(err);
      }
      res.json(post);
    });
  });


  app.delete('/posts/:post', function (req, res, next) {
    Post.remove(req.post, function (err, post) {
      if (err) {
        return next(err);
      }
      res.json(post);
    })

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
    comment.author = req.user.username;

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

  app.post('/register', function (req, res, next) {
    if (!req.body.email || !req.body.username || !req.body.password) {
      return res.status(400).json({message: 'Please fill out all fields'});
    }
    var user = new User();

    user.username = req.body.username;
    user.password = req.body.password;
    user.email = req.body.email;
    user.blogTitle = req.body.blogTitle;
    user.blogDesc = req.body.blogDesc;

    user.save(function (err) {
      if (err) {
        return next(err);
      }

      return res.json({token: user.generateJWT()})
    });
  });

  app.post('/login', function (req, res, next) {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({message: 'Please fill out all fields'});
    }

    passport.authenticate('local', function (err, user, info) {
      if (err) {
        return next(err);
      }

      if (user) {
        return res.json({token: user.generateJWT()});
      } else {
        return res.status(401).json(info);
      }
    })(req, res, next);
  });

};