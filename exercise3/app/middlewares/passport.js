let nodeifyit = require('nodeifyit');
let _ = require('lodash-node');
let LocalStrategy = require('passport-local').Strategy;
let strategies = {
  facebook: require('passport-facebook').Strategy,
  twitter: require('passport-twitter').Strategy,
  google: require('passport-google-oauth').OAuth2Strategy,
  linkedin: require('passport-linkedin-oauth2').Strategy
};
let passport = require('passport');
let User = require('../models/user');


require('songbird');

function useExternalPassportStrategy(OauthStrategy, config, field) {

  config.passReqToCallback = true;
  passport.use(field, new OauthStrategy(config, nodeifyit(authCB, {spread: true})));


  /**
   *  1. Load user from store
   * 2. If req.user exists, we're authorizing (connecting an account)
   * 2a. Ensure it's not associated with another account
   * 2b. Link account
   * 3. If not, we're authenticating (logging in)
   * 3a. If user exists, we're logging in via the 3rd party account
   * 3b. Otherwise create a user associated with the 3rd party account
   * find the user in the database based on their facebook id

   * @param req
   * @param token
   * @param refreshToken
   * @param profile
   * @returns {*}
   */
  // function(accessToken, refreshToken, profile, done) {

  async function authCB(req, token, refreshToken, profile) {
    let query = {};
    query[`${field}.id`] = profile.id;
    let user = await User.promise.findOne(query);
    // if the user is found, then log them in
    if (user && user[field].token) {
      return user
    }

    if (req.user) {
      if (user) {
        user[field].token = token;
        return await user.promise.save();
      }
      // user already exists and is logged in, we have to link accounts
      user = req.user; // pull the user out of the session

    } else {
      // if there is no user found with that facebook id, create them
      user = new User();
    }
    // set all of the facebook information in our user model
    user[field] = {
      id: profile.id,
      token: token
    };

    switch (field) {
      case 'facebook':
        user[field].name = profile.name.givenName + ' ' + profile.name.familyName;
        user[field].email = profile.emails[0].value;
        break;
      case 'google':
      case 'linkedin':
        user[field].name = profile.displayName;
        user[field].email = profile.emails[0].value;
        break;
      case 'twitter':
        user[field].username = profile.username;
        user[field].displayName = profile.displayName;
        break;
      default:
        console.log('Unknow field')

    }
    // save the user
    return await user.promise.save();

  }
}

function configure(config) {
  // Required for session support / persistent login sessions
  passport.use('local-login', new LocalStrategy({
    passReqToCallback: true,
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true
  }, nodeifyit(async (req, email, password) => {

    let user = await User.promise.findOne({'local.email': email});

    if (!user || email !== user.local.email) {
      return [false, {message: 'Invalid username'}]
    }

    if (!await user.validatePassword(password)) {
      return [false, {message: 'Invalid password'}]
    }
    return user
  }, {spread: true})));

  passport.serializeUser(nodeifyit(async (user) => user._id));
  passport.deserializeUser(nodeifyit(async (_id) => {
    return await User.promise.findById(_id)
  }));

  passport.use('local-signup', new LocalStrategy({
    passReqToCallback: true,
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true
  }, nodeifyit(async (req, email, password) => {
    email = (email || '').toLowerCase();
    // Is the email taken?
    if (await User.promise.findOne({'local.email': email})) {
      return [false, {message: 'That email is already taken.'}]
    }
    //  If we're logged in, we're connecting a new local account.
    if (req.user) {
      var user = req.user;
      user.local.email = email;
      user.local.password = await user.generateHash(password);
      return await user.promise.save();
    }
    //  We're not logged in, so we're creating a brand new user.
    else {
      // create the user
      let user = new User();
      user.local.email = email;
      // Use a password hash instead of plain-text
      user.local.password = await user.generateHash(password);
      return await user.save()
    }
  }, {spread: true})));

  //set up all 3rd party strategies
  _.forIn(config, (val, key)=> useExternalPassportStrategy(strategies[key], val, key));

  return passport
}


module.exports = {passport, configure};