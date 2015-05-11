let mongoose = require('mongoose');
let bcrypt = require('bcrypt');
let jwt = require('jsonwebtoken');

require('songbird');

function validateUsername(username) {
  let ck_username = /^[A-Za-z0-9_]{4,20}$/;
  return ck_username.test(username);
}

function validateEmail(email) {
  let ck_email = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
  return ck_email.test(email);
}

function validatePassword(password) {
  let ck_password = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{4,20}$/;
  let common_passwords = ['123456'];

  return !(common_passwords.indexOf(password) > -1) && ck_password.test(password);
}

let usernameValidator = [validateUsername, 'Username {VALUE}` not valid, please check again fill in again'],
  passwordValidator = [validatePassword, 'Password `{VALUE}` not valid, please check again fill in again'],
  emailValidator = [validateEmail, 'Email `{VALUE}` not valid, please check again fill in again'];

let UserSchema = mongoose.Schema({
  username: {type: String, required: true, unique: true, validate: usernameValidator},
  username_l: {type: String, lowercase: true},
  email: {type: String, required: true, unique: true, validate: emailValidator},
  email_l: {type: String, lowercase: true},
  password: {type: String, required: true, validate: passwordValidator},
  blogTitle: String,
  blogDesc: String,
  role: { type: String, enum:['admin', 'member'],default:'member' },
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now},
  lastAccessed: {type: Date, default: Date.now}
});

UserSchema.pre('save', function (next) {
  this.password = this.generateHash(this.password);
  this.username_l = this.username.toLowerCase();
  this.email_l = this.email.toLowerCase();
  next();
});


UserSchema.methods.generateJWT = function () {
  let payload = {
    id: this.id,
    username: this.username,
    email:this.email
  };
  return jwt.sign(payload, 'SECRET', { expiresInMinutes: 60 });
};

UserSchema.methods.generateHash = async function (password) {
  return await bcrypt.promise.hash(password, 8)
}

UserSchema.methods.validatePassword = async function (password) {
  return await bcrypt.promise.compare(password, this.password)
}


module.exports = mongoose.model('User', UserSchema);