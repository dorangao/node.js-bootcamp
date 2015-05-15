let path = require('path')
let express = require('express')
let morgan = require('morgan')
let cookieParser = require('cookie-parser')
let bodyParser = require('body-parser')
let session = require('express-session')
let mongoose = require('mongoose')
let MongoStore = require('connect-mongo')(session)
let requireDir = require('require-dir')
let bcrypt = require('bcrypt')
let flash = require('connect-flash')

const SALT = bcrypt.genSaltSync(10)

let passportMiddleware = require('./app/middlewares/passport')

const NODE_ENV = process.env.NODE_ENV

let app = express(),
  config = requireDir('./config', {recurse: true}),
  port = process.env.PORT || 8000


passportMiddleware.configure(config.auth)
app.passport = passportMiddleware.passport

// connect to the database
mongoose.connect(config.database[NODE_ENV].url)

// set up our express middleware
app.use(morgan('dev')) // log every request to the console
app.use(cookieParser('ilovethenodejs')) // read cookies (needed for auth)
app.use(bodyParser.json()) // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs') // set up ejs for templating

// required for passport
app.use(session({
  cookie : {
    maxAge: 36000000 // in milliseconds
  },
  secret: 'ilovethenodejs',
  store: new MongoStore({db: 'social-feeder'}),
  resave: true,
  saveUninitialized: true
}))
// Setup passport authentication middleware
app.use(app.passport.initialize())
// persistent login sessions
app.use(app.passport.session())
// Flash messages stored in session
app.use(flash())

// configure routes
require('./app/routes')(app)

// start server
app.listen(port, ()=> console.log(`Listening @ http://127.0.0.1:${port}`))