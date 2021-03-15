// 笔趣网

var GetInfo = require("./base");
class Bqw extends GetInfo {
  constructor(hosts, titleSelector, contentSelector) {
    super(hosts, titleSelector, contentSelector)
  }
}

var hosts = ['http://www.xbiquge.la', 'http://www.biquge.info'],
  titleSelector = ".bookname h1",
  contentSelector = "#content";

module.exports = new Bqw(hosts, titleSelector, contentSelector);
