let User = require('../models/user');

require('songbird');

module.exports = async function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    // Is the email taken?
    let user = await User.promise.findById(req.session.user._id);
    if (user) {
      req.user = user;
      req.session.user = user;  //refresh the session value
      res.locals.user = user;
    }
  }
  if (!req.user) {
    res.redirect('/authcentral');
  } else {
    next();
  }
}
