var crawler = require("./modules/crawler/index");
var { getSpider } = require("./utils/index");

if (process.argv.length > 2) {
  const [url, spider] = getSpider(process.argv[2], false, JSON.parse(process.argv[3]))
  try {
    crawler(url, function f ($) {
      process.send(spider.getData($));
    }, function f (error) {
      process.send(false, error);
    });
  } catch (error) {
    process.send(false, error);
  }
  
} else {
  process.send('false');
}
