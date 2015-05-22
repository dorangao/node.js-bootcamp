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
let routes = require('./routes')

require('songbird');
let users = {}
let numUsers = 0;
module.exports = class App {
  constructor(config) {
    this.server = server;
    this.app = app;
    this.io = io;

// set up our express middleware
    this.app.use(morgan('dev')) // log every request to the console
    this.app.use(cookieParser('ilovethenodejs')) // read cookies (needed for auth)
    this.app.use(bodyParser.json()) // get information from html forms
    this.app.use(bodyParser.urlencoded({extended: true}))

    app.use(express.static(path.join(__dirname, '../../public')));
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

    this.app.use(this.sessionMiddleWare);

    routes(this.app)

    this.setupIO();

  }

  async initialize(port) {
    await this.server.promise.listen(port)
    // Return this to allow chaining
    return this
  }

  setupIO() {
    this.io.use((socket, next) => {
      this.sessionMiddleWare(socket.request, socket.request.res, next)
    });
    // And add some connection listeners:
    this.io.on('connection', (socket) => {
      console.log('a user connected');

      let addedUser = false;

      // when the client emits 'new message', this listens and executes
      socket.on('new message', function (data) {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
          username: socket.username,
          message: data
        });
      });

      // when the client emits 'add user', this listens and executes
      socket.on('add user', function (username) {
        // we store the username in the socket session for this client
        socket.username = username;
        users[username] = username;
        ++numUsers;
        addedUser = true;

        socket.emit('login', {
          numUsers: numUsers
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
          username: socket.username,
          numUsers: numUsers
        });
      });

      // when the client emits 'typing', we broadcast it to others
      socket.on('typing', function () {
        socket.broadcast.emit('typing', {
          username: socket.username
        });
      });

      // when the client emits 'stop typing', we broadcast it to others
      socket.on('stop typing', function () {
        socket.broadcast.emit('stop typing', {
          username: socket.username
        });
      });

      // when the user disconnects.. perform this
      socket.on('disconnect', function () {
        // remove the username from global usernames list
        if (addedUser) {
          delete users[socket.username];
          --numUsers;

          // echo globally that this client has left
          socket.broadcast.emit('user left', {
            username: socket.username,
            numUsers: numUsers
          });
        }
      });
    });
  }

}

