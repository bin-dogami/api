// 笔趣阁 https://www.fyxfcw.com/
var GetInfo = require("./base");
const { menusAnalysis, getMenus } = require("../../utils/filter");

const types = ['修真', '玄幻', '科幻', '穿越', '都市', '网游', '其他']
class Bqw extends GetInfo {
  constructor(selectors, selectorMenu) {
    super(selectors, selectorMenu)
  }

  // 干掉作者不相干字
  filterAuthor (selector) {
    const content = selector.text()
    if (typeof content === 'string') {
      return content.replace(/\s/g, '').replace('作者:', '').replace('作者：', '');
    } else {
      return content;
    }
  }

  filterDescription (selector) {
    const content = selector.text()
    if (typeof content === 'string') {
      return content.replace(/\s/g, '').replace('简介:', '').replace('简介：', '')
    } else {
      return content
    }
  }

  filterType (selector) {
    const content = selector.text()
    if (typeof content === 'string') {
      const type = content.replace(/\s/g, '')
      const fType = types.filter(({ t }) => type.includes(t))
      return fType.length ? fType[0] : '其他'
    } else {
      return '其他'
    }
  }

  filterThumb (selector) {
    return selector.attr('src');
  }

  getNextPageUrl = ($) => {
    return $('.right a').attr('href')
  }

  // 获取一页的目录
  getPageMenus ($) {
    return getMenus($('.section-list').eq(1).find('a'), $)
  }

  // menus
  getAllMenus (aMenus, lastMenuInfo) {
    return menusAnalysis(aMenus, {}, 0, JSON.parse(lastMenuInfo))
  }
}

const selectors = {
  title: ($) => $(".top h1"),
  author: ($) => $(".top p").eq(0),
  description: ($) => $(".m-desc"),
  type: ($) => $(".top p").eq(1),
  realType: ($) => $(".top p").eq(1),
  thumb: ".imgbox img",
}

const selectorMenu = "";

module.exports = new Bqw(selectors, selectorMenu);
