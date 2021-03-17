var crawler = require("./modules/crawler/index");
var { getSpider } = require("./utils/index");

if (process.argv.length > 2) {
  const [url, spider] = getSpider(process.argv[2], true)
  crawler(url, function f ($) {
    process.send(spider.getContent($));
  }, function f (error) {
    process.send(false, error);
  });
} else {
  process.send('false');
}
