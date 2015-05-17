// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {
  facebook : {
    clientID: '845993015455182',
    clientSecret: 'd56948043a025b7f96263ce2c7087b76',
    callbackURL: 'http://socialauthenticator.com:8000/auth/facebook/callback'
  },
  google : {
    clientID: '640123772188-altppir46p45qf408q5u4e1l5a3vpn1a.apps.googleusercontent.com',
    clientSecret: 'vvMirS1e7mhAR6XQ5e-otlvs',
    callbackURL: 'http://socialauthenticator.com:8000/auth/google/callback'
  },
  linkedin : {
    clientID: '75j7dzo78ow9th',
    clientSecret: '0zjuV6c5puLWhRub',
    callbackURL: 'http://socialauthenticator.com:8000/auth/linkedin/callback',
    state:'CA'
  },
  twitter : {
    consumerKey: 'GuMmaJVtU1tiPjNNIx3UCs7bv',
    consumerSecret: 'Rtp6TvKPo0xQiVLCcReqaZanDuGqaoF8vL3bseifFFqnvByQbh',
    callbackUrl: 'http://socialauthenticator.com:8000/auth/twitter/callback'
  }
};