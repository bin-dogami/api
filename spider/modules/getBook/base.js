const { menusAnalysis } = require("../../utils/filter");

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
      const v = this.selectors[key];
      const selector = typeof v === 'string' ? $(v) : v($);
      const filterFnName = this.getFilterFuncName(key);
      const filterFn = this[filterFnName] || (dom => dom.text());
      o[key] = selector ? filterFn(selector) : '';
    });
    return o;
  }

  getMenus ($, len, lastMenuInfo) {
    if (!this.selectorMenu) {
      return [];
    }

    return menusAnalysis($(this.selectorMenu), $, len, JSON.parse(lastMenuInfo))
  }
}

module.exports = GetInfo;
