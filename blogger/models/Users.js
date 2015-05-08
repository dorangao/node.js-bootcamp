let mongoose = require('mongoose');
let bcrypt = require('bcrypt');
let jwt = require('jsonwebtoken');

require('songbird');

let UserSchema = mongoose.Schema({
  username: {type: String, lowercase: true, unique: true},
  password: String
});

UserSchema.methods.generateHash = async function (password) {
  return await bcrypt.promise.hash(password, 8)
}

UserSchema.methods.validatePassword = async function (password) {
  return await bcrypt.promise.compare(password, this.password)
}

UserSchema.methods.generateJWT = function () {

  // set expiration to 60 days
  let today = new Date();
  let exp = new Date(today);
  exp.setDate(today.getDate() + 7);

  let toSign = {
    id: this.id,
    username: this.username,
    exp: parseInt(exp.getTime() / 1000)
  };

  console.dir(toSign);

  return jwt.sign(toSign, 'SECRET');
};

module.exports = mongoose.model('User', UserSchema);