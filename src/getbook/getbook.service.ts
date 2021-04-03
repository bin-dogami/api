import { sqlnovels } from './../sqlnovels/sqlnovels.entity';
import { Injectable, Controller } from '@nestjs/common';
const spawn = require("child_process").spawn;
const child_process = require('child_process');
import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { sqlnovels as novels } from '../sqlnovels/sqlnovels.entity';
import { SqlauthorsService } from '../sqlauthors/sqlauthors.service';
import { getNovelId, downloadImage, ImagePath } from '../utils/index'
import { Mylogger } from '../mylogger/mylogger.service';

@Injectable()
export class GetBookService {
  private readonly logger = new Mylogger(GetBookService.name);

  constructor(
    private readonly sqlauthorsService: SqlauthorsService,
    private readonly sqlnovelsService: SqlnovelsService,
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
    let _novel = null
    try {
      return await this.sqlnovelsService.create(newNovel);
    } catch (err) {
      this.logger.end(`### [failed] 写入书数据失败：${err} ###`);
      return `写入书数据失败：${err}`
    }
  }
}
