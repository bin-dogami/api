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
  '九': 9,
  '两': 2
}
const powMap = {
  '十': 10,
  '百': 100,
  '千': 1000,
  '万': 10000,
}
// 提取标题中的数字
// const getIndexFromTitle = (title) => {
//   let t = `${title}`
//   let isSureMenuNum = 0
//   if (t.includes('章')) {
//     t = t.replace(/章.*/, '').trim()
//     isSureMenuNum++
//   }
//   if (t.includes('第')) {
//     t = t.replace(/.*第/, '').trim()
//     isSureMenuNum++
//   }
//   if (isSureMenuNum >= 2) {
//     // 对这样的进行处理： 第901、902、903章 了却因果
//     const match = t.match(/(?<=[^\d]?)\d+(?=[^\d]?)/g)
//     if (match && match.length > 1) {
//       return match
//     }
//   }
//   // 004失去记忆的自己是个食人魔？ 这样没有章也没有第的
//   if (t === title) {
//     const matches = t.trim().match(/^(\d+)/)
//     t = matches && matches.length ? matches[1] : t
//   }

//   // @TODO: 这里还是有些问题，得判断出是否以数字开头，且数字有效
//   // 先简单修复 万分抱歉 这样的标题
//   if (t === title) {
//     return 0
//   }

//   t = t.replace(/[^零一二三四五六七八九十百千万\d]/g, '')
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

// 从抓取的目录中获取有效数据
function getMenus ($domMenus, $) {
  if (!$domMenus || !$domMenus.length) {
    return []
  }
  const menus = [];

  [].forEach.call($domMenus, (item) => {
    const _item = $(item);
    const url = _item.attr('href');
    const title = _item.text();
    if (!url || !url.trim() || !title || !title.trim()) {
      return
    }
    menus.push({
      url: url.trim(),
      title: title.trim()
    })
  })

  return menus
}

// 返回本次要抓取的章节信息，index 按顺序排列，不管是否分卷，如果分卷且每次章节数都回到1开始，会自动改为在上一卷的基础上累加
// 返回 null，需要重新再抓取一次目录；返回 string，有异常，反馈给后台
// lastMenuInfo ： 分别获取 id 最大的一个和 index 最大的一个，如果它们相等就是 lastMenuInfo；如果不相等， id 大的是 lastMenuInfo，然后把另一个的 index 赋给 lastMenuInfo，就叫 lastMenuInfo.maxIndex
// 无卷的 index 以抓取到的目录名里值为准，分卷（不一定有卷字）的在上一卷的最后一个 index 基础上加上目录名中的值
const menusAnalysis = ($domMenus, $, lastMenuInfo = null) => {
  const menus = getMenus($domMenus, $)
  if (!menus.length) {
    return null
  }

  let lastOrigTitle = ''
  let lastmname = ''
  let lastIndex = -1
  // lastMenuInfo 是上一个 id 最大的，但不一定是 index 最大的，所以要再获取一次 index 最大的然后赋给 lastMenuInfo 的 maxIndex
  let lastMaxIndex = -1
  if (lastMenuInfo) {
    lastOrigTitle = lastMenuInfo.moriginalname
    lastmname = lastMenuInfo.mname
    lastIndex = lastMenuInfo.index
    lastMaxIndex = lastMenuInfo.maxIndex || lastMenuInfo.index || -1
  }

  // 从头or尾开始遍历，true 为从头开始
  const orderFromStart = lastIndex < 20
  let index = orderFromStart ? 0 : menus.length - 1
  let findLastSpiderMenu = false
  const _menus = []
  while (menus.length) {
    orderFromStart ? index++ : index--
    // 新抓取的书从第一章开始遍历，旧书从最后一章开始遍历
    const { url, title } = menus[orderFromStart ? 'shift' : 'pop']()

    if (lastMenuInfo) {

      // 从 头 开始抓取的只有在找到上一次抓取的目录后才开始抓取
      if (orderFromStart && findLastSpiderMenu) {
        addMenu(_menus, title, url, true)
      }

      // 查找到上一次抓取的目录
      if (title === lastOrigTitle) {
        findLastSpiderMenu = true
      } else if (title.includes(lastmname)) {
        const { index, mname } = analysisTitle(title)
        if (lastIndex === index && mname === lastmname) {
          findLastSpiderMenu = true
        }
      }

      if (!orderFromStart && findLastSpiderMenu) {
        break
      }

      // 从 尾部 开始抓取的一开始就抓，到上一次抓取的目录后中断
      if (!orderFromStart && !findLastSpiderMenu) {
        addMenu(_menus, title, url, false)
      }
    } else {
      findLastSpiderMenu = true
      addMenu(_menus, title, url, true)
    }
  }

  // @TODO: 卷没啥用，先干掉吧，有时候再处理回来吧
  // 分卷并且 index 回归 1 重复循环的抢救一下；
  if (_menus.length) {
    // index 连续异常次数，比如 [100， 1， 2， 3, ...]，3次异常表示有问题应该是分卷了，需要累加
    let needReset = 0
    // 第一次出现异常的地方
    let needResetIndex = 0
    // 遍历一次，如果 index 有一个走着走着突然就变小了，然后又变大(必须确定后面是累加的，避免‘第三章错误修正说明’这样的误导)就可以确定是 needResetIndex 为 true
    let lastMax = lastMaxIndex
    for (const i in _menus) {
      const { index } = _menus[i]
      if (index <= 0) {
        continue
      }
      if (index < lastMax) {
        needReset === 0 && (needResetIndex = i)
        needReset++
        if (needReset >= 3) {
          // 中断再把
          break
        }
      } else if (index > lastMax) {
        lastMax = index
        needReset = needResetIndex = 0
      }
    }

    // 从异常部分开始累加 index
    let lastIndex = lastMax
    if (needReset >= 3) {
      _menus.forEach((item, pos) => {
        if (pos < needResetIndex) {
          return
        }

        if (item.index > 0) {
          item.index = lastIndex + 1
          lastIndex = item.index
        }
      })
    }
  }


  if (lastMenuInfo && !findLastSpiderMenu) {
    return `异常,找不到上一次抓取的最后一章: ${lastOrigTitle}`
  }


  return _menus
}

function addMenu (_menus, title, url, orderFromStart) {
  const { index, mname } = analysisTitle(title)
  _menus[orderFromStart ? 'push' : 'unshift']({
    index,
    // volume,
    url,
    mname,
    // 后面需要 title，懒得改了
    title,
    moriginalname: title
  })
}

// 分析 title，获得 index、 volume， 第xx章 、 xx章（前面有空格或者xx为开头）
// 验证title： ['第901、902、903章 了却因果', ''第一三七章 标题', '第3卷 第1百七3章 标题', '第3卷第1百七3章标题', '第十一卷 392章 标题', '33卷 千3百一十章 标题', '232章了却因果']
function analysisTitle (title) {
  // @TODO: 这块还有点问题 今天两章都在晚上。 => '都在晚上。'
  let mname = title

  let index = ''
  let matchFaild = true
  let hasNormalIndex = false

  // index 分析的很细致！
  if (title.includes('章')) {
    // ['第901、902、903章 了却因果', '第一三七章', '第1百七3章']
    const indexMatch = title.match(/第(.*)章/);
    // 第30章 标题
    [index, mname, hasNormalIndex, matchFaild] = dealNormNumByMatch(indexMatch, index, mname)
    // 第30章 标题 没匹配上再来匹配一下前面有空格的 30章 标题
    if (matchFaild) {
      // （有空格）30章 标题
      const indexMatch = title.match(/\s(.*)章/);
      [index, mname, hasNormalIndex, matchFaild] = dealNormNumByMatch(indexMatch, index, mname)

      if (matchFaild) {
        // 30章 标题 ；以30章开头，匹配字符边界和[\s^]、(\s|^) 都不靠谱，所以再起一个了，应该没有漏了吧
        const indexMatch = title.match(/^(.*)章/);
        [index, mname, hasNormalIndex, matchFaild] = dealNormNumByMatch(indexMatch, index, mname)
      }
    }
  }

  // 卷暂时用不着
  // let volume = ''
  // // 卷和 index 一样的判断
  // if (title.includes('卷')) {
  //   const volumeMatch = title.match(/第(.*)卷/)
  //   let hasNormalIndex = false
  //   let matchFaild = true
  //   // 第30章 标题
  //   [volume, mname, hasNormalIndex, matchFaild] = dealNormNumByMatch(volumeMatch, volume, mname)
  //   // 第30章 标题 没匹配上再来匹配一下前面有空格的 30章 标题
  //   if (matchFaild) {
  //     // （有空格）30章 标题
  //     const volumeMatch = title.match(/\s(.*)卷/)
  //     [volume, mname, hasNormalIndex, matchFaild] = dealNormNumByMatch(volumeMatch, volume, mname)

  //     if (matchFaild) {
  //       // 30章 标题 ；以30章开头，匹配字符边界和[\s^]、(\s|^) 都不靠谱，所以再起一个了，应该没有漏了吧
  //       const volumeMatch = title.match(/^(.*)卷/)
  //       [volume, mname, hasNormalIndex, matchFaild] = dealNormNumByMatch(volumeMatch, volume, mname)
  //     }
  //   }
  // }

  // 不符合上面的就不拯救了，使用终极技能 ignoreIndexRepeat 吧 (spider 表里)ob

  return {
    index: +index,
    // volume: +volume,
    mname: mname.trim()
  }
}

// 匹配成功index/volume 、 给 mname 减重 （能减就减）
function dealNormNumByMatch (match, index, mname) {
  let hasNormalIndex = false
  let matchFaild = true
  if (Array.isArray(match) && match.length) {
    if (match.length > 1) {
      index = match[1].trim()
      // 获取有效的 index
      index = cHNumToArabicNum(index)
      hasNormalIndex = true
    }
    // mname 去掉第XXX章，留个空格，避免章字和标题连在一起
    // @TODO:  just tips: 这还有可能会有问题，比如标题是 获得经文一章、一卷布 这样的，如果前面没有章或卷（所幸replace只替换第一个，有两个章就没问题）
    // 就会有问题了，这时候设定这本书 ignoreIndexRepeat (spider 表里) 就很有必要了
    mname = mname.replace(match[0], ' ')
    matchFaild = false
  }

  return [index, mname, hasNormalIndex, matchFaild]
}

// 中文 一二三 => 123；这个 text 是第xxx章中的xxx
function cHNumToArabicNum (text) {
  let _text = text.trim()
  if (/[零一二两三四五六七八九十百千万]/.test(_text)) {
    // 先把 0 - 9 的 替换为阿拉伯数字
    _text = _text.replace(/./g, (n) => {
      if (n in numMap) {
        return numMap[n]
      }
      return n
    }).replace(/^0+/, '')
    // 如果有 万千百十，留万千
    if (/[万千百十]/.test(_text)) {
      let first = ''
      _text = _text.replace(/[^\d万千百十]/g, '')
      _text = _text.split('').map((v, i) => {
        if (v in powMap) {
          if (first) {
            return ''
          }
          first = v
          return v
        }
        return +v
      })
      const aText = _text.join('').split(first)
      const fNum = powMap[first]
      let n0 = +aText[0]
      n0 = Math.max(n0, 1) * fNum
      let n1 = +aText[1]
      n1 = n1 * Math.pow(10, `${fNum}`.length - 1 - aText[1].length)
      return n0 + n1
    }
  }

  if (/^\d+$/.test(_text)) {
    return +_text
  }

  // 第901、902、903章
  const arrText = _text.split(/[^\d]/)
  while (arrText.length) {
    const t = arrText.shift()
    if (/^\d+$/.test(t)) {
      return +t
    }
  }
  return 0
}

module.exports = {
  menusAnalysis
}
