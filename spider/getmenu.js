var crawler = require("./modules/crawler/index");
var { getSpider } = require("./utils/index");

const getUrl = (url, index) => {
  return url.replace(/index_\d+\.html/, `index_${index}.html`)
}
const crawlerMenus = (spider, url) => {
  return new Promise((resolve, reject) => {
    crawler(url, function f ($) {
      const menus = spider.getPageMenus($)
      resolve([menus, spider.getNextPageUrl($)])
    }, function f (error) {
      reject(error)
    })
  })
}
let respiderTime = 1
const getAllMenus = async (spider, nextUrl, len, allMenus) => {
  let _allMenus = []
  try {
    const res = await crawlerMenus(spider, nextUrl)
    if (Array.isArray(res) && res.length > 1) {
      const [menus, path] = res
      if (menus.length) {
        _allMenus = [...allMenus, ...menus]
        if (len && _allMenus.length >= len) {
          return _allMenus.slice(0, len)
        } else if (path) {
          const url = getUrl(nextUrl, 1)
          const _path = getUrl(path, 1)
          return await getAllMenus(spider, url.replace(_path, '') + path, len, _allMenus)
        } else {
          return _allMenus
        }
      } else if (path) {
        return `（${nextUrl}页）抓取数据失败，还有下一页需要抓呢`
      } else {  // 最后一页就是空的数据
        return allMenus
      }
    }
    return `（${nextUrl}页）抓取数据失败，错误信息为 ${res}`
  } catch (error) {
    if (respiderTime > 3) {
      respiderTime = 1
      return `（${nextUrl}页）连续抓取三次失败：${error}`
    } else {
      respiderTime++
      console.log(`上一次抓取本页面目录失败，再抓第${respiderTime}次`)
      return await getAllMenus(spider, nextUrl, len, allMenus)
    }
  }

  // // let nextUrl = getUrl(url, 1)
  // let allMenus = []
  // while (1) {
  //   const res = spiderMenus(spider, nextUrl, lastMenuInfo)
  //   console.log(res)
  //   if (Array.isArray(res)) {
  //     const [menus, _nextUrl] = res
  //     nextUrl = _nextUrl
  //     if (menus.length) {
  //       allMenus = [...allMenus, ...menus]
  //       if (len && allMenus.length >= len) {
  //         console.log(allMenus.slice(0, len))
  //         // process.send(allMenus.slice(0, len))
  //         return
  //       }
  //     } else {
  //       // process.send(false, `（${nextUrl}页）抓取数据失败，还有下一页需要抓呢`);
  //       return
  //     }
  //   } else {
  //     // process.send(false, `（${nextUrl}页）抓取数据失败，错误信息为 ${res}`);
  //     return
  //   }
  // }
  // console.log(allMenus)
}

if (process.argv.length > 2) {
  const [url, spider, isMultiPagesSpider] = getSpider(process.argv[2], false, JSON.parse(process.argv[5]))
  let len = process.argv[3] ? +process.argv[3] : 0
  const lastMenuInfo = process.argv[4] || null

  // test for `node spider/getmenu.js`
  // const _url = 'https://www.fyxfcw.com/book/9839/index_337.html'
  // const [url, spider, isMultiPagesSpider] = getSpider(_url)
  // const len = 0
  // const lastMenuInfo = null

  const lastFrom = lastMenuInfo ? lastMenuInfo.from : ''
  // 目录必须分页抓取的网站
  if (isMultiPagesSpider) {
    // @TODO: 先写死 len，这块有点麻烦，还需要根据已抓取的目录去判断从第几页开始抓取
    len = 0
    getAllMenus(spider, lastFrom || getUrl(url, 1), len, []).then((allMenus) => {
      if (Array.isArray(allMenus)) {
        const _allMenus = spider.getAllMenus(allMenus, lastMenuInfo)
        process.send(_allMenus)
      } else {
        process.send(false, allMenus);
      }
    })
  } else {  // 一页就能把目录抓完
    crawler(url, function f ($) {
      process.send(spider.getMenus($, len, process.argv[4] || null));
    }, function f (error) {
      process.send(false, error);
    });
  }
} else {
  process.send('false', '输入的参数有问题');
}
