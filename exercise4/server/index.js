let requireDir = require('require-dir')
let App = require('./app/app');


const NODE_ENV = process.env.NODE_ENV || 'development'

let config = requireDir('./config', {recurse: true})
let port = process.env.PORT || 8000

let appconfig = {
  db: config.database[NODE_ENV],
  port:port
}

let app = new App(appconfig)

app.initialize(port)
  .then(()=> console.log(`Listening @ http://127.0.0.1:${port}`))
  // ALWAYS REMEMBER TO CATCH!
  .catch(e => console.log(e.stack ? e.stack : e))
