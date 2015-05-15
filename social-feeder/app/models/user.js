let mongoose = require('mongoose');
let bcrypt = require('bcrypt');

require('songbird');

let userSchema = mongoose.Schema({
  // userModel properties here...
  local: {
    email: String,
    password: String
  },
  facebook: {
    id: String,
    token: String,
    email: String,
    name: String
  },
  linkedin: {
    id: String,
    token: String,
    email: String,
    name: String
  },
  twitter: {
    id: String,
    token: String,
    tokenSecret: String,
    username: String,
    displayName: String
  },
  google: {
    id: String,
    token: String,
    email: String,
    name: String
  }
});

userSchema.methods.generateHash = async function(password) {
  return await bcrypt.promise.hash(password, 8)
};
userSchema.methods.validatePassword = async function(password) {
  return await bcrypt.promise.compare(password, this.local.password)
};

module.exports = mongoose.model('User', userSchema);
