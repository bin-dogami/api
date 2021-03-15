// 笔趣阁

var GetInfo = require("./base");
class Bqw extends GetInfo {
  constructor(hosts, titleSelector, contentSelector) {
    super(hosts, titleSelector, contentSelector)
  }

  getContent ($) {
    var _this = this;
    var node = $(this.contentSelector);
    if (!node.length) {
      return [];
    }
    var children = node.contents();
    if (!children.length) {
      return [];
    }
    const content = [];
    children.each(function (i, elem) {
      const $e = $(elem)
      if ($e[0].nodeType !== 3) {
        return
      }
      var text = $e.text();
      if (!text) {
        return;
      }
      text && content.push(text);
    });
    return content;
  }
}

var hosts = ['http://www.xbiquge.la', 'http://www.biquge.info'],
  titleSelector = "h1",
  contentSelector = "#content";

module.exports = new Bqw(hosts, titleSelector, contentSelector);
