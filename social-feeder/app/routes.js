let isLoggedIn = require('./middlewares/isLoggedIn');
let posts = require('../data/posts');
let nodeifyit = require('nodeifyit');
let networkHandler = require('./middlewares/networkHandler');
let _ = require('lodash-node');

require('songbird');

module.exports = (app) => {
  let passport = app.passport;

  app.get('/timeline', isLoggedIn, nodeifyit(networkHandler.getFeeds, {spread: true}), (req, res) => {
      res.render('timeline.ejs', {posts: req.posts})
    }
  );

  app.get('/compose', isLoggedIn, (req, res) => res.render('compose.ejs'));

  app.param('postid', (req, res, next, id) => {
    req.post = post;
    next();
  });

  app.post('/compose', isLoggedIn, nodeifyit(networkHandler.postFeed, {spread: true}), (req, res) => res.redirect('/timeline'));

  app.get('/reply/:network/:postid', isLoggedIn, (req, res) => res.render('reply.ejs', {post: req.post}));
  app.post('/reply/:network/:postid', isLoggedIn, (req, res) => res.render('timeline.ejs', {posts: posts}));

  app.get('/share/:network/:postid', isLoggedIn, (req, res) => res.render('share.ejs', {post: req.post}));
  app.post('/share/:network/:postid', isLoggedIn, (req, res) => res.render('timeline.ejs', {posts: posts}));

  app.post('/like/:network/:postid', isLoggedIn, (req, res) => res.render('timeline.ejs', {posts: posts}));
  app.post('/unlike/:network/:postid', isLoggedIn, (req, res) => res.render('timeline.ejs', {posts: posts}));


  app.get('/authcentral', (req, res) => res.render('authcentral.ejs'));

  app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      message: req.flash('error')
    })
  });

  app.get('/logout', (req, res) => {
    req.logout();
    req.session.destroy();
    res.redirect('/authcentral')
  });

  app.get('/login', (req, res) => {
    res.render('login.ejs', {message: req.flash('error')})
  });

  app.get('/signup', (req, res) => {
    res.render('signup.ejs', {message: req.flash('error')})
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }));

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }));

// locally --------------------------------
  app.get('/connect/local', function (req, res) {
    res.render('connect-local.ejs', {message: req.flash('loginMessage')});
  });
  app.post('/connect/local', passport.authenticate('local-signup', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/connect/local', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  app.param('linktype', function (req, res, next, id) {
    req.linktype = id;
    next();
  });


  let scopes = {
    facebook: {scope: ['email', 'publish_actions', 'read_stream']},
    twitter: {scope: 'email'},
    google: {scope: ['email', 'profile']},
    linkedin: {scope: ['r_emailaddress', 'r_basicprofile']}
  };

  //set up all 3rd party strategies
  _.forIn(scopes, (val, key)=> {
    app.get(`/auth/${key}`, passport.authenticate(key, val));
    app.get(`/auth/${key}/callback`,
      passport.authenticate(key, {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
      })
    );

    app.get(`/connect/${key}`, passport.authorize(key, val));
    app.get(`/connect/${key}/callback`, passport.authorize(key, {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
    }))

  });

  app.get('/unlink/:linktype', isLoggedIn, function (req, res) {
    let user = req.user;
    let linktype = req.linktype;
    switch (linktype) {
      case 'local':
        user.local.email = undefined;
        user.local.password = undefined;
        break;
      default:
        user[linktype].token = undefined;
    }
    user.promise.save().then(()=>
      res.redirect('/profile')).catch((err)=> {
      res.redirect('/profile')
    });
  });
};