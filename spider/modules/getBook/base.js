const { menusAnalysis } = require("../../utils/index");

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

  getMenus ($, lastMenuInfo) {
    if (!this.selectorMenu) {
      return [];
    }

    return menusAnalysis($(this.selectorMenu), $, JSON.parse(lastMenuInfo))

    const selectorMenu = $(this.selectorMenu);
    if (!selectorMenu || !selectorMenu.length) {
      return [];
    }





    let canSpider = false
    let uselessIndex = 0;
    const menusWithFrom = {};
    let _failedMenus = failedMenus ? JSON.parse(failedMenus) : null;
    _failedMenus = Array.isArray(_failedMenus) ? _failedMenus : [];
    const menus = [];
    [].forEach.call(selectorMenu, (item) => {
      const _item = $(item);
      const url = _item.attr('href');
      const title = _item.text();
      const index = getIndexFromTitle(title);
      const _index = Array.isArray(index) ? index[0] : index
      if (!url || !url.trim() || !title || !title.trim()) {
        return
      }
      if (hasSpideredIndex == 999999) {
        const _menuInfos = _failedMenus.filter(({ moriginalname }) => moriginalname === title)
        if (_menuInfos.length) {
          const id = _menuInfos[0].id
          menusWithFrom[id] = {
            url,
            title,
            index
          }
        }
        return
      }

      // 本书不是第一次抓取（hasSpideredIndex > 0）时，得在 index 到达 hasSpideredIndex 处才开始抓取
      if (hasSpideredIndex > 0 && _index <= hasSpideredIndex && !canSpider) {
        if (_index == hasSpideredIndex) {
          canSpider = true
        }
        return
      }

      menus.push({
        url,
        title,
        // 获取不到index 的就把 index 设置为 -1、-2、-3...
        index: _index > 0 ? index : --uselessIndex
      })
    });
    return [menus, menusWithFrom];
  }
}

module.exports = GetInfo;
