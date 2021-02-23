const test = ($) => {
  var children = $("#content").contents();
  children.each(function (i, elem) {
    console.log($(this).text());
  });
}

const numMap = {
  '零': 0,
  '一': 1,
  '二': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '七': 7,
  '八': 8,
  '九': 9
}
const powMap = {
  '十': 10,
  '百': 100,
  '千': 1000,
  '万': 10000,
}
// 提取标题中的数字
const getIndexFromTitle = (title) => {
  let t = `${title}`
  if (t.includes('章')) {
    t = t.replace(/章.*/, '').trim()
  }
  if (t.includes('第')) {
    t = t.replace(/.*第/, '').trim()
  }
  // 004失去记忆的自己是个食人魔？ 这样没有章也没有第的
  if (t === title) {
    const matches = t.trim().match(/^(\d+)/)
    t = matches && matches.length ? matches[1] : t
  }

  // @TODO: 这里还是有些问题，得判断出是否以数字开头，且数字有效
  // 先简单修复 万分抱歉 这样的标题
  if (t === title) {
    return 0
  }

  t = t.replace(/[^零一二三四五六七八九十百千万\d]/g, '')
  // 有汉字数字
  if (!/^\d+$/.test(t)) {
    // 汉字数字转化为阿拉伯数字，字母加空格好分组
    t = t.replace(/./g, (w) => {
      if (w in numMap) {
        return numMap[w]
      }
      if (['十', '百', '千', '万'].includes(w)) {
        return ` ${w} `
      }
      return w
    }).trim().replace(/^0+/, '')
    // 非纯数字
    if (/[十百千万]/.test(t)) {
      // 把数字和字母分开成一个数组
      const arr = t.split(/\s/)
      if (arr.length) {
        const _arr = []
        // 以 十百等 加前面的数字为一组，生成一个数组，最后再累加起来，千/万前面如果找不到数字自动加1
        arr.reduce((num, item, index) => {
          const _item = item.trim()
          if (/[十百千万]/.test(_item)) {
            _arr.push((num || 1) * powMap[_item])
            return 0
          } else if (item === '') {
            return num
          } else {
            if (index === arr.length - 1) {
              _arr.push(+_item)
            }
            return +_item
          }
        }, 0)
        t = _arr.reduce((num, item) => num + item, 0)
      }
    }
  }
  t = `${t}`.replace(/^0+/, '')
  return +t
}

module.exports = {
  getIndexFromTitle
};
