let request = require('request');
let Post = require('../models/Post');
let _ = require('lodash-node');
let requireDir = require('require-dir');
let config = requireDir('../../config', {recurse: true});


require('songbird');

let Twit = require('twit');
let google = require('googleapis');
let plus = google.plus('v1');
let OAuth2 = google.auth.OAuth2;
let oauth2Client = new OAuth2();


/**
 * To checked user's token existed or not.
 * @type {{postFeed: postFeed, likeFeed: likeFeed, unlikeFeed: unlikeFeed, getFeeds: getFeeds, replyFeed: replyFeed, deleteFeed: deleteFeed}}
 */
module.exports = {
  postFeed: postFeed,
  likeFeed: likeFeed,
  unlikeFeed: unlikeFeed,
  getFeeds: getFeeds,
  replyFeed: replyFeed,
  deleteFeed: deleteFeed
};

async function likeFeed(req, res, next) {

  let post = req.post;
  let network = post.network.icon;
  let user = req.user;

  switch (network) {

    case 'facebook':
      // Specify the URL and query string parameters needed for the request
      let url = 'https://graph.facebook.com/' + post.id + '/likes';
      let params = {
        access_token: user[network].token,
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

      await T.promise.post('favorites/create', {id: post.id});
      break;
    default:
      console.log(`unsupported network type:${network}`)
  }

  next();

}


async function unlikeFeed(req, res, next) {

  let post = req.post;
  let network = post.network.icon;
  let user = req.user;

  switch (network) {

    case 'facebook':
      // Specify the URL and query string parameters needed for the request
      let url = 'https://graph.facebook.com/' + post.id + '/likes';
      let params = {
        access_token: user[network].token,
      };
      // Send the request
      await request.promise.del({url: url, qs: params});
      break;
    case 'twitter':
      let T = new Twit({
        consumer_key: config.auth[network].consumerKey,
        consumer_secret: config.auth[network].consumerSecret,
        access_token: user[network].token,
        access_token_secret: user[network].tokenSecret
      });

      await T.promise.post('favorites/destroy', {id: post.id});
      break;
    default:
      console.log(`unsupported network type:${network}`)
  }

  next();

}


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

    case 'linkedin':
      // Specify the URL and query string parameters needed for the request
      let url = 'https://api.linkedin.com/v1/people/~/shares?format=json';
      let headers = {
        Authorization: 'Bearer ' + user[network].token,
        ContentType: 'application/json',
        'x-li-format': 'json'
      };
      let post = {
        "comment": content,
        "visibility": {
          "code": "anyone"
        }
      }
      // Send the request
      await request.promise.post({url: url, headers: headers, json: post});
      break;
    default:
      console.log(`unsupported network type:${network}`)
  }
  next();

}


async function deleteFeed(req, res, next) {

  let post = req.post;
  let network = post.network.icon;
  let user = req.user;

  switch (network) {

    case 'facebook':
      // Specify the URL and query string parameters needed for the request
      let url = 'https://graph.facebook.com/v2.3/' + post.id;
      let params = {
        access_token: user[network].token,
      };
      // Send the request
      await request.promise.del({url: url, qs: params});
      break;
    case 'twitter':
      let T = new Twit({
        consumer_key: config.auth[network].consumerKey,
        consumer_secret: config.auth[network].consumerSecret,
        access_token: user[network].token,
        access_token_secret: user[network].tokenSecret
      });
      await T.promise.post('statuses/destroy/' + post.id);
      break;
    default:
      console.log(`unsupported network type:${network}`)
  }

  next();

}


async function getFeeds(req, res, next) {
  let promises = [getTwitterFeeds(req, res), getFacebookFeeds(req, res), getLinkedInFeeds(req, res), getGoogleFeeds(req,res)];
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
    }
    p.key = v.key;
    p.id = v.id;
    p.image = v.image;
    p.text = v.text;
    p.name = v.name;
    p.username = v.username;
    p.created_time = v.created_time;
    p.liked = v.liked;
    p.network = v.network;
    promises.push(p.promise.save());
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
      name: val.name ? val.name : "",
      username: val.from.name,
      created_time: createdTime.toUTCString(),
      liked: val.likes ? _.find(val.likes.data, 'id', user.facebook.id) : false,
      network: {
        icon: 'facebook',
        name: 'Facebook',
        class: 'btn-danger'
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

  let [body] = await T.promise.get('statuses/home_timeline', {count: count});

  let posts = [];
  //set up all 3rd party strategies
  _.forIn(body, (val, key) => {
    let createdTS = Date.parse(val.created_at);
    let createdTime = new Date();
    createdTime.setTime(createdTS);
    posts.push({
      key: createdTS,
      id: val.id_str,
      image: "/assets/icons/flow.jpg",
      text: val.text,
      name: "",
      username: val.user.screen_name,
      created_time: createdTime.toUTCString(),
      liked: val.favorited,
      network: {
        icon: 'twitter',
        name: 'Twitter',
        class: 'btn-info'
      }
    })
  })
  return posts;
}


async function getGoogleFeeds(req, res, count = 5) {

  let user = req.user;
  let network = 'google';

  oauth2Client.setCredentials({
    access_token: user[network].token,
    refresh_token: user[network].refreshToken
  });

  let [body] = await plus.activities.promise.list({
    userId: 'me',
    collection: 'public',
    maxResults:count,
    auth: oauth2Client
  });

  let posts = [];
  //set up all 3rd party strategies
  _.forIn(body.items, (val, key) => {
    let createdTS = Date.parse(val.published);
    let createdTime = new Date();
    createdTime.setTime(createdTS);
    posts.push({
      key: createdTS,
      id: val.id,
      image: val.actor.image.url?val.actor.image.url:"/assets/icons/flow.jpg",
      text: val.object.content,
      name: "",
      username: val.actor.displayName,
      created_time: createdTime.toUTCString(),
      liked: val.favorited,
      network: {
        icon: 'google',
        name: 'Google Plus',
        class: 'btn-primary'
      }
    })
  });
  return posts;
}


async function getLinkedInFeeds(req, res, count = 5) {

  let user = req.user;
  let network = 'linkedin';
  // Specify the URL and query string parameters needed for the request
  let url = `https://api.linkedin.com/v1/people/~/current-share?format=json`;
  let headers = {
    Authorization: 'Bearer ' + user[network].token,
    ContentType: 'application/json',
    'x-li-format': 'json'
  };
  let params = {
    start: 0,
    count: count
  };

  // Send the request
  let [,body] = await request.promise.get({url: url, headers: headers, params: params});
  let val = JSON.parse(body);
  if (body.error) return console.error("Error returned from twitter: ", body.error);

  let posts = [];
  //set up all 3rd party strategies
  let createdTime = new Date();
  createdTime.setTime(val.timestamp);
  posts.push({
    key: val.timestamp,
    id: val.id,
    image: "/assets/icons/flow.jpg",
    text: val.comment,
    name: "",
    username: val.author.firstName + ' ' + val.author.lastName,
    created_time: createdTime.toUTCString(),
    liked: false,
    network: {
      icon: 'linkedin',
      name: 'Linkedin',
      class: 'btn-success'
    }
  });
  return posts;
}


async function replyFeed(req, res, next) {

  let network = req.post.network.icon;
  let user = req.user;
  let content = req.body.reply;

  switch (network) {

    case 'facebook':
      // Specify the URL and query string parameters needed for the request
      let url = 'https://graph.facebook.com/' + req.post.id + '/comments';
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

      //https://dev.twitter.com/rest/reference/post/statuses/update
      //in_reply_to_status_id: The ID of an existing status that the update is in reply to.
      //Note:: This parameter will be ignored unless the author of the tweet this parameter references is mentioned within the status text.
      //Therefore, you must include @username, where username is the author of the referenced tweet, within the update.
      await T.promise.post('statuses/update', {
        status: `@${req.post.username} ${content}`,
        in_reply_to_status_id: req.post.id
      });
      break;
    default:
      console.log(`unsupported network type:${network}`)
  }
  next();

}
