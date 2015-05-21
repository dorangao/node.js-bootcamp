// app/app.js
let path = require('path')
let morgan = require('morgan')
let session = require('express-session')
let mongoose = require('mongoose')
let MongoStore = require('connect-mongo')(session)
let cookieParser = require('cookie-parser')
let bodyParser = require('body-parser')
let express = require('express');
let app = express();
let server = require('http').createServer(app);
let io = require('socket.io')(server)
let browserify = require('browserify-middleware')
let babelify = require('babelify')
let routes = require('./routes')

require('songbird');

module.exports = class App {
  constructor(config) {
    this.server = server;
    this.app = app;
    this.io = io;
    this.usernames = {}
    this.numUsers = 0;
// set up our express middleware
    this.app.use(morgan('dev')) // log every request to the console
    this.app.use(cookieParser('ilovethenodejs')) // read cookies (needed for auth)
    this.app.use(bodyParser.json()) // get information from html forms
    this.app.use(bodyParser.urlencoded({extended: true}))

    app.use(express.static(path.join(__dirname, '../public')));
    this.app.set('views', path.join(__dirname, '../views'))
    this.app.set('view engine', 'ejs') // set up ejs for templating

// connect to the database
    mongoose.connect(config.db.url)

    this.sessionMiddleWare = session({
      cookie: {
        maxAge: 36000000 // in milliseconds
      },
      secret: 'ilovethenodejs',
      store: new MongoStore({db: 'social-feeder'}),
      resave: true,
      saveUninitialized: true
    });

    browserify.settings({transform: [babelify]})
    this.app.get('/js1/cli-index.js', browserify('./public/js/cli-index.js'))
    this.app.use(this.sessionMiddleWare);

    this.io.use((socket, next) => {
      this.sessionMiddleWare(socket.request, socket.request.res, next)
    })
    routes(this.app)

    // And add some connection listeners:
    this.io.on('connection', this.socketHandler)


  }

  async initialize(port) {
    await this.server.promise.listen(port)
    // Return this to allow chaining
    return this
  }

  socketHandler(socket) {
    console.log('a user connected');
    // 2. Store the username for each socket:
    let username = socket.request.session.username
    socket.on('im', msg => {
      // im received
      console.log(msg)
      // echo im back
      socket.broadcast.emit('im', {username, msg})
    })
    socket.on('disconnect', () => console.log('user disconnected'))
  }

}

