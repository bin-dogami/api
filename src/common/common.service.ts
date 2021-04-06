import { Injectable } from '@nestjs/common';
import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { IMenuErrors, SqlmenusService } from '../sqlmenus/sqlmenus.service';
import { isNumber } from '../utils/index'

// https://github.com/request/request#promises--asyncawait
// https://github.com/request/request-promise
var rp = require('request-promise');

@Injectable()
export class CommonService {
  constructor(
    private readonly sqlnovelsService: SqlnovelsService,
    private readonly sqlmenusService: SqlmenusService,
  ) {
  }

  // 获取已上线的书里的目录数据
  async getMenusByDateInOnlineNovles(sDate: string, eDate: string, online: string): Promise<any[]> {
    // 获取所有未上线的书，再后获取不等于这些书的（上线or不上等）目录
    const [novels, count] = await this.sqlnovelsService.getBooksByParams({
      where: { isOnline: false }
    })
    const nIds = novels.map(({ id }: { id: number }) => id)
    return await this.sqlmenusService.getMenusByCreateDate(sDate, eDate, +online || 1, nIds)
  }

  async setAllMnusOnline(ids: string): Promise<any> {
    if (typeof ids !== 'string') {
      return '数据类型不对'
    }
    if (ids === '') {
      return '所有目录一次性上线功能取消'
      // 一次性全部上线还是不要了
      // return await this.sqlmenusService.setAllMenusOnline()
    } else {
      const aIds = ids.split(',').map((id) => isNumber(id) ? +id : 0).filter((id) => !!id)
      return await this.sqlmenusService.batchSetMenusOnline(aIds)
    }
  }

  async curlBaiduSeo(links: string) {
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        msg: '测试成功(开发环境不能提交，因为数据是不对的)'
      }
    }

    if (links.length) {
      // https://ziyuan.baidu.com/linksubmit/index?site=http://m.zjjdxr.com/
      const res = await rp({
        url: 'http://data.zz.baidu.com/urls?site=https://m.zjjdxr.com&token=pyoHHEdGLmensoRP',
        method: "POST",
        // json: true,
        headers: {
          "content-type": "text/plain",
        },
        body: links
      })
      if (!res) {
        return {
          success: false,
          msg: '提交API接口返回值出错了'
        }
      }
      // @TODO: 写入 log里记录一下提交记录吧
      const { success, remain, not_valid, not_same_site, error, message } = JSON.parse(res)
      let text = JSON.stringify(res)
      if (success !== undefined) {
        let more = not_valid ? `不合法的url: ${not_valid.join(', ')}` : ''
        text = `提交收录成功，剩余收录数: ${remain}, ${more}`
      } else if (error !== undefined) {
        text = `提交收录失败(${error})，错误信息: ${message}`
      }
      return {
        success: !!success,
        msg: text
      }
    }
    return {
      success: false,
      msg: 'links 不能为空'
    }
  }
}

