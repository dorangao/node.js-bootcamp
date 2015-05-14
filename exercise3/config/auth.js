// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {
  facebook : {
    clientID: '',
    clientSecret: 'd56948043a025b7f96263ce2c7087b76',
    callbackURL: 'http://socialauthenticator.com:8000/auth/facebook/callback'
  },
  google : {
    clientID: '',
    clientSecret: 'bSellToxjcy_CVtuHCuouUsP',
    callbackURL: 'http://socialauthenticator.com:8000/auth/google/callback'
  },
  linkedin : {
    clientID: '',
    clientSecret: '0zjuV6c5puLWhRub',
    callbackURL: 'http://socialauthenticator.com:8000/auth/linkedin/callback',
    state:'CA'
   },
  twitter : {
    consumerKey: '',
    consumerSecret: 'Rtp6TvKPo0xQiVLCcReqaZanDuGqaoF8vL3bseifFFqnvByQbh',
    callbackUrl: 'http://socialauthenticator.com:8000/auth/twitter/callback'
  }
};