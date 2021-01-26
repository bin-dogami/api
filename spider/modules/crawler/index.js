var Crawler = require("crawler");

function crawler (url, callback, failedCallback) {
  var c = new Crawler({
    maxConnections: 10,
    // This will be called for each crawled page
    callback: function (error, res, done) {
      if (error) {
        failedCallback(error);
      } else {
        callback(res.$);
      }
      done();
    }
  });
  c.queue(url);
  return c;
}


module.exports = crawler;