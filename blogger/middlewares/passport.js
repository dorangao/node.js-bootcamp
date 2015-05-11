let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let mongoose = require('mongoose');
let User = mongoose.model('User');

passport.use(new LocalStrategy(
  function (username, password, done) {
    User.findOne(
      {
        $or: [
          {'username_l': username.toLowerCase()},
          {'email_l': username.toLowerCase()}
        ]
      }, function (err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, {message: 'Incorrect username.'});
        }
        if (!user.validatePassword(password)) {
          return done(null, false, {message: 'Incorrect password.'});
        }
        return done(null, user);
      }
    )
  }
))
;