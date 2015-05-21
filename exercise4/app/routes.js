module.exports = (app) => {
  app.get('/', (req, res) => res.render('index.ejs'))

  app.post('/', (req, res) => {
    console.dir(req);
    req.session.username = req.body.username
    res.redirect('/chat')
  })

  app.get('/chat', (req, res) => {
    let username = req.session.username
    let state = JSON.stringify({username})
    res.render('chat.ejs', {username, state})
  })

  app.get('/chat2', (req, res) => {
    let username = req.session.username
    let state = JSON.stringify({username})
    res.render('chat2.ejs', {username, state})
  })


}