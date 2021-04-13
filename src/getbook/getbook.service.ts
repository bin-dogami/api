import { sqlnovels } from './../sqlnovels/sqlnovels.entity';
import { Injectable, Controller } from '@nestjs/common';
const spawn = require("child_process").spawn;
const child_process = require('child_process');
import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { sqlnovels as novels } from '../sqlnovels/sqlnovels.entity';
import { SqlpagesService } from '../sqlpages/sqlpages.service';
import { SqlauthorsService } from '../sqlauthors/sqlauthors.service';
import { ITumor, formula, SqltumorService } from '../sqltumor/sqltumor.service';
import { getNovelId, downloadImage, ImagePath, getHost } from '../utils/index'
import { Mylogger } from '../mylogger/mylogger.service';

@Injectable()
export class GetBookService {
  private readonly logger = new Mylogger(GetBookService.name);
  tumorUseFixList = null;

  constructor(
    private readonly sqlauthorsService: SqlauthorsService,
    private readonly sqlnovelsService: SqlnovelsService,
    private readonly sqlpagesService: SqlpagesService,
    private readonly sqltumorService: SqltumorService,
  ) {
  }

  _getBook(url: string) {
    return new Promise((resolve, reject) => {
      const child = child_process.fork('./spider/getbook.js', [url]);
      child.on('message', function (v, error) {
        if (error) {
          reject(error);
        }
        resolve(v);
      });
    })
  }

  async getBookInfo(url: string): Promise<any> {
    try {
      const o = await this._getBook(url);
      if (typeof o === 'object') {
        o['from'] = url;
      }
      return o;
    } catch (err) {
      return {
        err
      };
    }
  }

  // @TODO: 抓取 fyxfcw.com 的目录会卡住不动
  _getMenu(url: string, len: number, lastMenus?: any) {
    return new Promise((resolve, reject) => {
      const child = child_process.fork('./spider/getmenu.js', [url, len || '', JSON.stringify(lastMenus || null)]);
      child.on('message', function (v, error) {
        if (error) {
          reject(error);
        }
        resolve(v);
      });
    })
  }

  async getMenus(url: string, len: number, lastMenus?: any): Promise<any> {
    const fn = async () => {
      let i = 5
      while (i-- > 0) {
        console.log(`上一次抓取目录list失败，第${6 - i}次尝试抓取`)
        const o = await this.delayDo('_getMenu', url, len, lastMenus)
        if (o) {
          return o
        }
      }

      return {
        err: '抓取目录失败'
      }
    }
    try {
      const o: any = await this._getMenu(url, len, lastMenus);
      if (o) {
        return o;
      }
      return await fn()
    } catch (err) {
      return await fn()
    }
  }

  _getPage(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = child_process.fork('./spider/getpage.js', [url]);
      child.on('message', function (v, error) {
        if (error) {
          reject(error);
        }
        resolve(v);
      });
    })
  }

  delayDo(fnName, ...args): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const res = await this[fnName](...args)
          resolve(res)
        } catch (err) {
          reject(err)
        }
      }, 1500);
    })
  }

  async getPageInfo(url: string): Promise<any> {
    const fn = async () => {
      let i = 5
      while (i-- > 0) {
        console.log(`上一次抓取page内容失败，第${6 - i}次尝试抓取`)
        const list = await this.delayDo('_getPage', url)
        if (list && list.length) {
          return list
        }
      }

      return {
        err: '抓取页面失败'
      }
    }
    try {
      const list = await this._getPage(url);
      if (list && list.length) {
        return list;
      }
      return await fn()
    } catch (err) {
      return await fn()
    }
  }

  async getImage(path: string, url: string, id: number): Promise<any> {
    return await downloadImage(path, url, id);
  }

  // isSpider： {true: '要抓取的书，在getbook.controller里用', false: '要手动添加的书，接口在 fixdata 里' }
  async createNovel(isSpider: boolean, title: string, author: string, thumb: string, description: string, typeid: number, typename: string, from: string): Promise<string | novels> {
    const lastNovelId = await this.sqlnovelsService.findLastId();
    const currentNovelId = getNovelId(lastNovelId);
    let newThumbPath = ''
    if (isSpider) {
      this.logger.log(`# 开始抓取书封面到 image 目录 #`);
      newThumbPath = await downloadImage(ImagePath + 'images', thumb, currentNovelId)
    } else {
      // 先上传图片再创建id 的
      newThumbPath = thumb.replace(/\d+/g, `${currentNovelId}`)
    }
    let authorInfo = await this.sqlauthorsService.findOneByAuthorName(author);
    let authorId = 0
    if (authorInfo) {
      authorId = authorInfo.id
    } else {
      try {
        authorInfo = await this.sqlauthorsService.create({
          novelIds: [],
          name: author,
          level: 0,
          levelName: '',
        });
        if (authorInfo) {
          authorId = authorInfo.id
        }
      } catch (error) {
        this.logger.end(`# [failed] 创建作者数据失败，作者：[${author}]，错误信息：${error} #`);
        return `创建作者数据失败，作者：[${author}]，错误信息：${error}`
      }
    }
    const newNovel = {
      id: currentNovelId,
      title,
      otitle: title,
      description: description.length > 990 ? description.substr(0, 990) : description,
      author,
      authorId,
      typeid: typeid,
      typename: typename,
      from: from ? [from] : [],
      tags: [],
      thumb: newThumbPath.replace(ImagePath, ''),
      // 新添加的书先不上，等确定没问题了再上（顺便也提交百度收录）
      isOnline: false
    }
    if (!authorInfo.novelIds.includes(currentNovelId)) {
      authorInfo.novelIds.push(currentNovelId)
      await this.sqlauthorsService.updateAuthor(authorInfo)
    }
    // 写入书信息
    this.logger.log(`# 开始写入书信息 #`);
    try {
      return await this.sqlnovelsService.create(newNovel);
    } catch (err) {
      this.logger.end(`### [failed] 写入书数据失败：${err} ###`);
      return `写入书数据失败：${err}`
    }
  }

  // page content 一次放不下的分多页，id 为当前 id+1，如果id 被占用了就再+1，以此类推
  async getNextPageId(id: number) {
    const nextId = id + 1
    if (await this.sqlpagesService.findOne(nextId)) {
      return await this.getNextPageId(nextId)
    } else {
      return nextId
    }
  }

  async insertPage(from: string, novelId: number, mId: number, args: any, log?: any) {
    const { moriginalname, index, res, menus } = args
    const list = await this.getPageInfo(from);
    if (!list || !Array.isArray(list) || 'err' in list) {
      const err = list && list.err ? `(${list.err})` : ''
      log && log(`###[failed] 获取章节内容失败 ${err}, 目录名：【${moriginalname} 】, 是第${index} 章 ###`);
      // if (res) {
      //   index > 0 && res.failedIndex.push(index)
      //   await this.insertPageFailed(mId, id, index, from, moriginalname, '获取章节内容失败: ' + err)
      // }

      return err
    }

    const tumorList = await this.sqltumorService.findList(false, getHost(from));
    const contentList: string[] = await this.dealContent(list, tumorList)
    if (res && !menus.length) {
      res.lastPage = `第${index} 章: 【${moriginalname} 】 <br />${contentList[0]}`;
    }
    if (!contentList[0].trim().length) {
      log && log(`# [failed] 插入章节内容失败，抓到的内容为空或错误 # 目录名：【${moriginalname}】, 是第${index}章, 错误信息：一个字也没抓到 \n`)
      // if (res) {
      //   index > 0 && res.failedIndex.push(index)
      //   await this.insertPageFailed(mId, id, index, from, moriginalname, '插入章节内容失败，抓到的内容为空或错误')
      // }
      return '抓到的内容为空或错误'
    }
    let i = 0
    let nextId = mId

    // @TODO: 先用修复的清理内容的文本简单地再次替换一下，之后再优化吧
    if (this.tumorUseFixList === null) {
      this.tumorUseFixList = await this.sqltumorService.findList(true);
    }

    while (contentList.length) {
      let content = contentList.shift()

      // @TODO: 先用修复的清理内容的文本简单地再次替换一下，之后再优化吧
      Array.isArray(this.tumorUseFixList) && this.tumorUseFixList.forEach(({ text }: { text: string }) => {
        content = content.replace(text, '')
      })

      i++
      const page = i > 1 ? `第${i}页` : ''
      log && log(`# 第${index} 章${page}开始插入page，此章节共 ${content.length} 个字 #`);
      const pageId = i === 1 ? mId : nextId
      nextId = contentList.length ? await this.getNextPageId(pageId) : 0
      await this.sqlpagesService.create({
        id: pageId,
        nextId,
        novelId,
        content: content,
        wordsnum: content.length,
      });
      const mIdText = i === 1 ? '' : `目录id: ${mId}`
      log && log(`# 插入章节内容成功 # 目录名：【${moriginalname}】, 是第${index}章${page}, 字数：${content.length}；id: ${pageId}；${mIdText} \n`)
    }
  }

  // 把字数过多的章节拆分成段
  async splitContent(list: string[], tumorList: any[], max: number) {
    const cList = []
    let arr = []
    let len = 0
    const fn = async (arr: any[], cList: any[]) => {
      const contentList = await this.dealContent(arr, tumorList)
      if (contentList.length && contentList[0]) {
        cList.push(contentList[0])
      }
    }
    while (1) {
      if (!list.length) {
        await fn(arr, cList)
        break;
      }
      const item = list.shift()
      // 7 为 <p></p>
      if (item.length + 7 + len < max) {
        arr.push(item)
        len += item.length + 7
      } else {
        // 最后一个应该再减掉，不然就超了
        list.unshift(item)
        arr.pop()
        await fn(arr, cList)
        arr = []
        len = 0
      }
    }

    return cList
  }

  async dealContent(list: string[], tumorList: any[]) {
    if (!list || !list.length) {
      return ['']
    }

    const splitStr = '$&$#@@@#$&$'
    const content = list.join(splitStr)
    // 直接替换 的排前面，避免 直接替换 的内容部分里含其他类型的
    const _tumorList = tumorList.sort(({ type }) => type === ITumor.JUST_REPLACE ? -1 : 1)
    let _content = formula(content, _tumorList)
    _content = _content.split(splitStr).map((str) => {
      const _str = str.trim()
      return _str.length ? `<p>${_str}</p>` : ''
    }).join('')
    // TEXT 能存 65535 / 4（utf8mb4类型每一个字符占4个字节） 个汉字
    // 字数超出 text 限制时多分几次存储
    if (_content.length > 16000) {
      return await this.splitContent(list, tumorList, 16000)
    }
    return [_content]
  }
}
