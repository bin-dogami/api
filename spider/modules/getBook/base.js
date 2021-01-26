const { getIndexFromTitle } = require("../../utils/index");

// 笔趣网
class GetInfo {
  constructor(selectors, selectorMenu) {

    // this.hosts = hosts || [];
    // @TODO: 过滤的看有没有必要抽离成基类
    // this.forbidWords = forbidWords || [];
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
      if (key === 'thumb') {
        o[key] = selector ? this.filterThumb(selector) : '';
        return;
      }
      const filterFnName = this.getFilterFuncName(key);
      const filterFn = this[filterFnName] || (t => t);
      o[key] = selector ? filterFn(selector.text()) : '';
    });
    return o;
  }

  getMenus ($, hasSpideredIndex, faildIndex) {
    if (!this.selectorMenu) {
      return [];
    }
    const selectorMenu = $(this.selectorMenu);
    if (!selectorMenu || !selectorMenu.length) {
      return [];
    }
    let uselessIndex = 0;
    const reFaildIndex = [];
    const _faildIndex = faildIndex.split(',').map((v) => v > 0 ? +v : 0).filter((v) => !!v);
    const menus = [].map.call(selectorMenu, (item, key) => {
      const _item = $(item);
      const url = _item.attr('href');
      const title = _item.text();
      const index = getIndexFromTitle(title);
      if (!url || !url.trim() || !title || !title.trim()) {
        if (Array.isArray(faildIndex) && faildIndex.includes(index)) {
          reFaildIndex.push(index);
        }
        return false;
      }
      if (Array.isArray(_faildIndex) && _faildIndex.includes(index)) {
        // nothing
      } else if (index <= hasSpideredIndex) {
        return false;
      }

      return {
        url,
        title,
        // 获取不到index 的就把 index 设置为 -1、-2、-3...
        index: index > 0 ? index : --uselessIndex
      }
    });
    return [menus.filter((item) => !!item), reFaildIndex];
  }
}

module.exports = GetInfo;
