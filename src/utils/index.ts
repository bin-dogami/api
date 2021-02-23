const fs = require('fs');
const download = require('download');

const getRandom = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min
}

export const getFirstNovelId = () => {
  return getRandom(12345, 34567);
}

export const getNovelId = (id: number) => {
  return id + getRandom(0, 100);
}

export const getFirstMenuId = () => {
  return getRandom(123456, 345678);
}

// 一次性要抓取的章节多的跨度大
export const getMenuId = (id: number, isNew?: boolean) => {
  return id + getRandom(0, isNew ? 3000 : 300);
}

// 移到spider/utils 里去了
// const numMap = {
//   '零': 0,
//   '一': 1,
//   '二': 2,
//   '三': 3,
//   '四': 4,
//   '五': 5,
//   '六': 6,
//   '七': 7,
//   '八': 8,
//   '九': 9
// }
// const powMap = {
//   '十': 10,
//   '百': 100,
//   '千': 1000,
//   '万': 10000,
// }
// // 提取标题中的数字
// export const getIndexFromTitle = (title: string) => {
//   // 先去除章或者空格之后的内容
//   let t = `${title}`.replace(/[章].*/, '').replace(/[^零一二三四五六七八九十百千万\d]/g, '')
//   // 有汉字数字
//   if (!/^\d+$/.test(t)) {
//     // 汉字数字转化为阿拉伯数字，字母加空格好分组
//     t = t.replace(/./g, (w) => {
//       if (w in numMap) {
//         return numMap[w]
//       }
//       if (['十', '百', '千', '万'].includes(w)) {
//         return ` ${w} `
//       }
//       return w
//     }).trim().replace(/^0+/, '')
//     // 非纯数字
//     if (/[十百千万]/.test(t)) {
//       // 把数字和字母分开成一个数组
//       const arr = t.split(/\s/)
//       if (arr.length) {
//         const _arr = []
//         // 以 十百等 加前面的数字为一组，生成一个数组，最后再累加起来，千/万前面如果找不到数字自动加1
//         arr.reduce((num, item, index) => {
//           const _item = item.trim()
//           if (/[十百千万]/.test(_item)) {
//             _arr.push((num || 1) * powMap[_item])
//             return 0
//           } else if (item === '') {
//             return num
//           } else {
//             if (index === arr.length - 1) {
//               _arr.push(+_item)
//             }
//             return +_item
//           }
//         }, 0)
//         t = _arr.reduce((num, item) => num + item, 0)
//       }
//     }
//   }
//   t = `${t}`.replace(/^0+/, '')
//   return +t
// }

// 可能是这样： 004失去记忆的自己是个食人魔？（http://localhost:3010/book/23084）
export const getValidTitle = (title: string) => {
  if (title.includes('章')) {
    return title.replace(/.*章\s*/, '').trim()
  }
  return title.trim().replace(/^(\d+)/, '')
}

// 获取域名，带 http 或 https 的
export const getHostFromUrl = (url: string) => {
  return url.replace(/(?<=(https?:\/\/)[^\/]+)\/.*/, '')
}

// 获取域名，不带 http
export const getHost = (url: string) => {
  const _url = getHostFromUrl(url)
  return _url.replace(/https?:\/\//, '')
}

export const downloadImage = async (path: string, url: string, id: number) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }

  const urlSplitArr = url.split('.');
  const imageType = urlSplitArr.length ? urlSplitArr[urlSplitArr.length - 1] : 'jpg';
  const filePath = `${path}/${id}.${imageType}`;
  fs.writeFileSync(filePath, await download(url));
  return filePath;
}