var crawler = require("./modules/crawler/index");
var { bqw } = require("./modules/getBook/index");

if (process.argv.length > 2) {
  crawler(process.argv[2], function f ($) {
    process.send(bqw.getData($));
  }, function f (error) {
    process.send(false, error);
  });
} else {
  process.send('false');
}
