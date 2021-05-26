// 笔趣网
class GetInfo {
  constructor(hosts, titleSelector, contentSelector) {
    this.hosts = hosts || [];
    this.titleSelector = titleSelector || 'h1';
    this.contentSelector = contentSelector;
  }

  getTitle ($) {
    const h1 = $(this.titleSelector) || $('h1');
    if (h1) {
      return h1.text();
    }
    return '';
  }

  getContent ($) {
    const contentSelector = this.contentSelector
    // 特殊结构的里面一定有 dom 这个key，可能是 {dom: '#booktext', exclude: [/高速文字手打.*/]}
    // 也可能是 #booktext	
    const isSpecialStructor = typeof contentSelector === 'object' ? 'dom' in contentSelector : false
    const node = isSpecialStructor ? $(contentSelector.dom) : (typeof contentSelector === 'string' ? $(contentSelector) : contentSelector)
    // var node = $(this.contentSelector);
    if (!node.length) {
      return [];
    }
    const children = node.contents();
    const childrenLen = children.length
    if (!children.length) {
      return [];
    }
    const content = [];
    children.each(function (i, elem) {
      var text = $(elem).text();
      if (!text) {
        return;
      }
      // 最后三个去掉 exclude数据
      if (isSpecialStructor && ('exclude') in contentSelector && i > childrenLen - 4) {
        const excludes = contentSelector.exclude
        if (Array.isArray(excludes)) {
          excludes.forEach((reg) => {
            if (reg instanceof RegExp) {
              text = text.replace(reg, '')
            }
          })
        } else if (excludes instanceof RegExp) {
          text = text.replace(excludes, '')
        }
      }
      content.push(text);
    });
    return content;
  }
}

module.exports = GetInfo;
