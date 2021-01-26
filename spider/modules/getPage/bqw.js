// 笔趣网

var GetInfo = require("./base");
class Bqw extends GetInfo {
  constructor(hosts, forbidWords, titleSelector, contentSelector) {
    super(hosts, forbidWords, titleSelector, contentSelector)
  }
}

var hosts = ['http://www.xbiquge.la', 'http://www.biquge.info'],
  forbidWords = [
    '笔趣',
    'biquge',
    'xbiquge',
  ],
  titleSelector = ".bookname h1",
  contentSelector = "#content";

module.exports = new Bqw(hosts, forbidWords, titleSelector, contentSelector);
