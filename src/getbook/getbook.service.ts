import { Injectable } from '@nestjs/common';
import { downloadImage } from '../utils/index';
var spawn = require("child_process").spawn;
var child_process = require('child_process');

@Injectable()
export class GetBookService {
  getHello(): string {
    return 'Hello old bin!';
  }

  _getBook(url: string) {
    return new Promise((resolve, reject) => {
      var child = child_process.fork('./spider/getbook.js', [url]);
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

  _getMenu(url: string, lastIndex?: number, failedMenus?: string) {
    return new Promise((resolve, reject) => {
      var child = child_process.fork('./spider/getmenu.js', [url, lastIndex, failedMenus]);
      child.on('message', function (v, error) {
        if (error) {
          reject(error);
        }
        resolve(v);
      });
    })
  }

  async getMenus(url: string, lastIndex?: number, failedMenus?: string): Promise<any> {
    try {
      const o = await this._getMenu(url, lastIndex, failedMenus);
      return o;
    } catch (err) {
      return {
        err
      };
    }
  }

  _getPage(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      var child = child_process.fork('./spider/getpage.js', [url]);
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
      setTimeout(() => {
        try {
          const res = this[fnName](...args)
          resolve(res)
        } catch (err) {
          reject(err)
        }
      }, 1500);
    })
  }

  async getPageInfo(url: string): Promise<any> {
    try {
      const list = await this._getPage(url);
      if (list && list.length) {
        return list;
      }
    } catch (err) {
      let i = 5
      while (i-- > 0) {
        const list = await this.delayDo('_getPage', url)
        if (list && list.length) {
          return list
        }
      }
      return {
        err: '抓取页面失败'
      }
    }
  }

  async getImage(path: string, url: string, id: number): Promise<any> {
    return await downloadImage(path, url, id);
  }
}
