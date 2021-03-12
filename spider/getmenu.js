var crawler = require("./modules/crawler/index");
var { bqw } = require("./modules/getBook/index");

if (process.argv.length > 2) {
  const url = process.argv[2].replace('paoshuzw.com', 'xbiquge.la')
  crawler(url, function f ($) {
    process.send(bqw.getMenus($, process.argv[3] || null));
  }, function f (error) {
    process.send(false, error);
  });
} else {
  process.send('false');
}
