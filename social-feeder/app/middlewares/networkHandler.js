let request = require('request');
let Post = require('../models/Post');
let _ = require('lodash-node');
let requireDir = require('require-dir')
let config = requireDir('../../config', {recurse: true});

require('songbird');

let Twit = require('twit');

module.exports = {
  postFeed: postFeed,
  getFeeds: getFeeds,
  replyFeed: replyFeed
};

async function postFeed(req, res, next) {

  let content = req.body.content;
  let network = req.body.network;
  let user = req.user;

  switch (network) {

    case 'facebook':
      // Specify the URL and query string parameters needed for the request
      let url = 'https://graph.facebook.com/' + user[network].id + '/feed';
      let params = {
        access_token: user[network].token,
        message: content
      };
      // Send the request
      await request.promise.post({url: url, qs: params});
      break;
    case 'twitter':
      let T = new Twit({
        consumer_key: config.auth[network].consumerKey,
        consumer_secret: config.auth[network].consumerSecret,
        access_token: user[network].token,
        access_token_secret: user[network].tokenSecret
      });

      await T.promise.post('statuses/update', {status: content});
      break;
    default:
      console.log(`unsupported network type:${network}`)
  }

  next();

}


async function getFeeds(req, res, next) {
  let promises = [getTwitterFeeds(req, res), getFacebookFeeds(req, res)];
  req.posts = _.flatten(await Promise.all(promises)).sort((a, b)=>b.key - a.key);
  await saveFeeds(req);
  next();
}

async function saveFeeds(req) {
  let promises = []
  _.forIn(req.posts, async (v) => {
    let p = await Post.promise.findOne({'id': v.id});
    if (!p) {
      p = new Post();
      p.key = v.key;
      p.id = v.id;
      p.image = v.image;
      p.text = v.text;
      p.name = v.name;
      p.username = v.username;
      p.created_time = v.created_time;
      p.liked = v.liked;
      p.network = v.network;
      console.log(p);
      promises.push(p.promise.save())
    }
  })
  await Promise.all(promises);
}

async function getFacebookFeeds(req, res, count = 5) {

  let user = req.user;

  // Specify the URL and query string parameters needed for the request
  let url = `https://graph.facebook.com/${ user['facebook'].id}/feed`;
  let params = {
    access_token: user['facebook'].token,
    limit: count
  };
  // Send the request
  let [,body] = await request.promise.get({url: url, qs: params});

  body = JSON.parse(body);
  if (body.error) return console.error("Error returned from facebook: ", body.error);

  let posts = [];
  //set up all 3rd party strategies
  _.forIn(body.data, (val, key) => {
    let createdTS = Date.parse(val.created_time);
    let createdTime = new Date();
    createdTime.setTime(createdTS);
    posts.push({
      key: createdTS,
      id: val.id,
      image: val.picture ? val.picture : "/assets/icons/flow.jpg",
      text: val.message,
      name: val.name ? name : "",
      username: val.from.name,
      created_time: createdTime.toUTCString(),
      liked: true,
      network: {
        icon: 'facebook',
        name: 'Facebook',
        class: 'btn-primary'
      }
    });
  });
  return posts;
}

async function getTwitterFeeds(req, res, count = 5) {

  let user = req.user;
  let network = 'twitter';

  let T = new Twit({
    consumer_key: config.auth[network].consumerKey,
    consumer_secret: config.auth[network].consumerSecret,
    access_token: user[network].token,
    access_token_secret: user[network].tokenSecret
  });

  let [body] = await T.promise.get('statuses/user_timeline', {count: count});

  let posts = [];
  //set up all 3rd party strategies
  _.forIn(body, (val, key) => {
    let createdTS = Date.parse(val.created_at);
    let createdTime = new Date();
    createdTime.setTime(createdTS);
    posts.push({
      key: createdTS,
      id: val.id,
      image: "/assets/icons/flow.jpg",
      text: val.text,
      name: "",
      username: val.user.name,
      created_time: createdTime.toUTCString(),
      liked: true,
      network: {
        icon: 'twitter',
        name: 'Twitter',
        class: 'btn-info'
      }
    })
  })
  return posts;
}

function replyFeed(req, res, next) {

}

