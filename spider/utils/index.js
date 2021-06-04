var { base, xbqg, bqg } = require("../modules/getBook/index");
var { pagebase, pageXbqg, pageBqg } = require("../modules/getPage/index");


const getSpider = (_url, isPage = false, spiderHostDoms = '') => {
  let url = _url
  const spiderList = {
    xbqg: ['xbiquge.la', 'paoshuzw.com'],
    bqg: ['fyxfcw.com']
  }
  const _xbqg = isPage ? pageXbqg : xbqg
  const _bqg = isPage ? pageBqg : bqg
  let spider = _xbqg
  // 根据抓取的dom结构去抓取
  if (spiderHostDoms && typeof spiderHostDoms === 'object') {
    Object.keys(spiderHostDoms).forEach((key) => {
      let value = spiderHostDoms[key]
      if (typeof value === 'string' && value.includes('{')) {
        spiderHostDoms[key] = eval(`(${value})`)
      }
    })
    if (isPage) {
      const {mname, content} = spiderHostDoms
      return [url, new pagebase('', mname, content), false]
    } else {
      const {menus, ...selectors} = spiderHostDoms
      return [url, new base(selectors, menus), false]
    }
  }
  Object.keys(spiderList).map((key) => {
    const filterS = spiderList[key].filter((host) => url.includes(host))
    if (filterS.length) {
      switch (key) {
        case 'xbqg':
          spider = _xbqg
          break;
        case 'bqg':
          spider = _bqg
          break;

        default:
          break;
      }
      url = url.replace('paoshuzw.com', 'xbiquge.la')
      url = url.replace('x23us.us', '23us.tw')
    }
  })
  // 目录是否是分页的
  const isMultiPagesSpider = spider === _bqg
  return [url, spider, isMultiPagesSpider]
}

module.exports = {
  getSpider
}