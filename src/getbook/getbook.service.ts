import { Injectable } from '@nestjs/common';
import { downloadImage, log } from '../utils/index';
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
          log(error);
        }
        resolve(v);
      });
    })
  }

  async getBookInfo(url: string): Promise<any> {
    const o = await this._getBook(url);
    if (typeof o === 'object') {
      o['from'] = url;
    }
    return o;
  }

  _getMenu(url: string, lastIndex?: number, faildIndex?: string) {
    return new Promise((resolve, reject) => {
      var child = child_process.fork('./spider/getmenu.js', [url, lastIndex, faildIndex]);
      child.on('message', function (v, error) {
        if (error) {
          log(error);
        }
        resolve(v);
      });
    })
  }

  async getMenus(url: string, lastIndex?: number, faildIndex?: string): Promise<any> {
    return await this._getMenu(url, lastIndex, faildIndex);
  }

  _getPage(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      var child = child_process.fork('./spider/getpage.js', [url]);
      child.on('message', function (v, error) {
        if (error) {
          log(error);
        }
        resolve(v);
      });
    })
  }

  delayDo(fnName, ...args): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this[fnName](...args))
      }, 1000);
    })
  }

  async getPageInfo(url: string): Promise<any> {
    let list = await this._getPage(url);
    if (list && list.length) {
      return list;
    }

    let i = 5
    while (i-- > 0) {
      list = await this.delayDo('_getPage', url)
      if (list && list.length) {
        return list
      }
    }
    return []
  }

  async getImage(path: string, url: string, id: number): Promise<any> {
    return await downloadImage(path, url, id);
  }
}
