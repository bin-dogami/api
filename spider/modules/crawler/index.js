var Crawler = require("crawler");

function crawler (url, callback, failedCallback) {
  var c = new Crawler({
    maxConnections: 10,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_2_1 like Mac OS X) AppleWebKit/601.1.13 (KHTML, like Gecko) Version/13.0.3 Mobile/25E116 Safari/602.1',
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