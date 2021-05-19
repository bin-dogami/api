const { menusAnalysis } = require("../../utils/filter");

const validKeys = ['title', 'author', 'description', 'type', 'thumb']

class GetInfo {
  constructor(selectors, selectorMenu) {
    this.selectors = selectors;
    this.selectorMenu = selectorMenu;
  }

  getFilterFuncName (key) {
    return 'filter' + key.substr(0, 1).toUpperCase() + key.substr(1);
  }

  getData ($) {
    const o = {};
    Object.keys(this.selectors).forEach((key) => {
      if (!validKeys.includes(key)) {
        return
      }
      const v = this.selectors[key];
      // 特殊结构的里面一定有 dom 这个key
      const vIsSpecialStructor = typeof v === 'object' ? 'dom' in v : false
      let selector = null
      if (typeof v === 'string') {
        selector = $(v)
      } else if (vIsSpecialStructor) {
        selector = $(v.dom)
      } else {
        selector = v($)
      }
      const filterFnName = this.getFilterFuncName(key);
      const filterFn = this[filterFnName] || (dom => dom.text());
      let value = filterFn(selector.eq(0))
      if (Array.isArray(v['replace'])) {
        value = value.replace(/[\n\r]/g, '')
        v['replace'].forEach((reg) => {
          value = value.replace(reg, '')
        })
      }
      o[key] = selector ? value : '';
    });
    return o;
  }

  getMenus ($, len, lastMenuInfo) {
    if (!this.selectorMenu) {
      return [];
    }

    return menusAnalysis($(this.selectorMenu), $, len, JSON.parse(lastMenuInfo))
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

  filterThumb (selector) {
    return selector.attr('src');
  }
}

module.exports = GetInfo;
