let path = require('path');
let express = require('express');
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
let session = require('express-session');
let flash = require('connect-flash');
let bcrypt = require('bcrypt');
let nodeifyit = require('nodeifyit');
let passport = require('passport');


let morgan = require('morgan')
require('songbird');

let mongoose = require('mongoose');
let Post = require('./models/Posts');
let Comment = require('./models/Comments');
let User = require('./models/Users');
let Image = require('./models/Images');

require('./middlewares/passport');

// connect to database
mongoose.connect('mongodb://127.0.0.1:27017/blogger-demo');
let routes = require('./routes/routes');


const SALT = bcrypt.genSaltSync(10);
let app = express();
app.passport = passport;

app.use(morgan('dev'));

// Get POST/PUT body information (e.g., from html forms)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

// Use the passport middleware to enable passport
app.use(passport.initialize());

// Use ejs for templating
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


routes(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
app.use(function (err, req, res, next) {
  return res.status(err.status || 500).json({message: err.message})
});


module.exports = app;
