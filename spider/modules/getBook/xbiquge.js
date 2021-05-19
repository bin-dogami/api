// 新笔趣阁 http://www.xbiquge.la/ 、http://www.paoshuzw.com/
var GetInfo = require("./base");
class Bqw extends GetInfo {
  constructor(selectors, selectorMenu) {
    super(selectors, selectorMenu)
  }

  // // 干掉作者不相干字
  // filterAuthor (selector) {
  //   const content = selector.text()
  //   if (typeof content === 'string') {
  //     return content.replace(/\s/g, '').replace('作者:', '').replace('作者：', '');
  //   } else {
  //     return content;
  //   }
  // }

  // filterThumb (selector) {
  //   return selector.attr('src');
  // }
}

const selectors = {
  title: "#info h1",
  author: ($) => $("#info p").eq(0),
  description: ($) => $("#intro p").eq(1),
  type: ($) => $(".con_top").children('a').eq(1),
  thumb: "#fmimg img",
}

const selectorMenu = "#list a";

module.exports = new Bqw(selectors, selectorMenu);
