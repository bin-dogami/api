var crawler = require("./modules/crawler/index");

if (process.argv.length > 3) {
  const url = process.argv[2]
  const navsSelector = eval(`(${process.argv[3]})`)
  const bookUrlRule = eval(`(${process.argv[4]})`)
  crawler(url, function f ($) {
    const booksA = $('a')
    let navUrls = []
    navsSelector.forEach((selector) => {
      const nav = $(selector)
      nav && nav.length && [].forEach.call(nav, (item) => {
        const _item = $(item);
        const url = _item.attr('href');
        if (url) {
          const _url = url.trim()
          const title = _item.text();
          // https://www.xbiquge.la/ 里我的书架这个导航要去掉，因为它要登陆
          if (_url && !title.includes('我的') && !title.includes('书架')) {
            navUrls.push(_url)
          }
        }
      })
    })
    let bookUrls = []
    booksA && booksA.length && [].forEach.call(booksA, (item) => {
      const _item = $(item);
      const url = _item.attr('href');
      const title = _item.text();
      if (url && title) {
        const _url = url.trim()
        const _title = title.trim()
        if (_url && _title && bookUrlRule.test(_url)) {
          bookUrls.push({
            url: _url,
            title: _title
          })
        }
      }
    })
    process.send([bookUrls, navUrls]);
  }, function f (error) {
    process.send(false, error);
  });
} else {
  process.send('false');
}
