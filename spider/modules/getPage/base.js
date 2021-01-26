// 笔趣网
class GetInfo {
  constructor(hosts, forbidWords, titleSelector, contentSelector) {
    this.hosts = hosts || [];
    this.forbidWords = forbidWords || [];
    this.titleSelector = titleSelector || 'h1';
    this.contentSelector = contentSelector;
  }

  getTitle ($) {
    const h1 = $(this.titleSelector) || $('h1');
    if (h1) {
      return h1.text();
    }
    return '';
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
      var text = $(elem).text();
      if (!text) {
        return;
      }
      _this.forbidWords.forEach((item) => {
        text = text.replace(item, '');
      })
      text && content.push(text);
    });
    return content;
  }
}

module.exports = GetInfo;
