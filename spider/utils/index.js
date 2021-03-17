var { xbqg, bqg } = require("../modules/getBook/index");
var { pageXbqg, pageBqg } = require("../modules/getPage/index");


const getSpider = (_url, isPage) => {
  let url = _url
  const spiderList = {
    xbqg: ['xbiquge.la', 'paoshuzw.com'],
    bqg: ['fyxfcw.com']
  }
  const _xbqg = isPage ? pageXbqg : xbqg
  const _bqg = isPage ? pageBqg : bqg
  let spider = _xbqg
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
    }
  })
  const isMultiPagesSpider = spider === _bqg
  return [url, spider, isMultiPagesSpider]
}

module.exports = {
  getSpider
}