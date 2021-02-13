// import { log } from '../utils/index'
import { Controller, Get, Post, Query, Body, Param, HttpCode } from '@nestjs/common';
import { ScanService } from './scan.service';

import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { SqltypesService } from '../sqltypes/sqltypes.service';
import { SqlmenusService } from '../sqlmenus/sqlmenus.service';
import { SqlpagesService } from '../sqlpages/sqlpages.service';
import { SqlrecommendsService } from '../sqlrecommends/sqlrecommends.service';
import { SqltypesdetailService } from '../sqltypesdetail/sqltypesdetail.service';

import { sqlnovels as novels } from '../sqlnovels/sqlnovels.entity';
import { sqlauthors as authors } from '../sqlauthors/sqlauthors.entity';
import { sqlmenus as menus } from '../sqlmenus/sqlmenus.entity';
import { sqlrecommends as recommends } from '../sqlrecommends/sqlrecommends.entity';
import { SqlauthorsService } from '../sqlauthors/sqlauthors.service';
import { sqlpages as pages } from '../sqlpages/sqlpages.entity';

import { Mylogger } from '../mylogger/mylogger.service';

const shuffle = function (arr: any[]): any[] {
  let m = arr.length,
    t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

// @TODO: 每个list请求每次取200个数据存 redis 里，返回给前端固定20
@Controller('scan')
export class ScanController {
  private readonly logger = new Mylogger(ScanController.name);

  constructor(
    private readonly scanService: ScanService,
    private readonly sqlnovelsService: SqlnovelsService,
    private readonly sqltypesService: SqltypesService,
    private readonly sqlmenusService: SqlmenusService,
    private readonly sqlpagesService: SqlpagesService,
    private readonly sqlauthorsService: SqlauthorsService,
    private readonly sqlrecommendsService: SqlrecommendsService,
    private readonly sqltypesdetailService: SqltypesdetailService,
  ) { }

  // 查询具体书
  @Get('getBookBySearch')
  async getBookBySearch(@Query('name') name: string, @Query('id') id: number): Promise<novels> {
    return await this.sqlnovelsService.getBookByTitleId(name, +id)
  }

  // 阅读历史
  @Get('getBooksLastPageByIds')
  async getBooksLastPageByIds(@Query('ids') ids: any[]): Promise<menus[]> {
    let _ids = ids.length > 20 ? ids.slice(0, 20) : ids
    _ids = _ids.map((item) => JSON.parse(item))
    const nIds = _ids.map(({ id }) => id)
    const list = await this.sqlmenusService.findLastMenuByNovelIds(nIds)
    return list.filter(({ id, novelId }) => {
      for (const item of _ids) {
        if (item.id === novelId) {
          return id > item.pageId
        }
      }
      return false
    })
  }

  // 模糊查询
  @Get('getBookByName')
  async getBookByName(@Query('name') name: string): Promise<novels[]> {
    return await this.sqlnovelsService.getBookByTitleWithLike(name)
  }

  @Get('getTypesData')
  async getTypesData(@Query('id') id: number, @Query('skip') skip: number, @Query('size') size?: number): Promise<any> {
    const types = await this.sqltypesService.findAll(false)
    const _size = +size || 20
    const list = await this.getBooksByType(id, +skip, Math.min(50, _size))
    return {
      types,
      list
    }
  }

  // 首页
  @Get('getIndexData')
  async getIndexData(): Promise<any[]> {
    const types = await this.sqltypesService.findAll(false)
    const hotsData = await this.getBooksByHot(0, 4)
    const typesData = [];
    for (const { id, name } of types) {
      const books = await this.sqlnovelsService.getIndexBooksByType(id)
      typesData.push({
        id,
        name,
        books
      })
    }
    return [
      typesData,
      hotsData
    ]
  }

  // 根据分类获取书list，skip： 从第几个开始，不是从第几页开始
  @Get('getBooksByType')
  async getBooksByType(@Query('typeId') typeId: number, @Query('skip') skip: number, @Query('size') size?: number): Promise<novels[]> {
    return await this.sqlnovelsService.getBooksByType(+typeId, +skip, +size);
  }

  // 根据全本书list
  @Get('getBooksByCompleted')
  async getBooksByCompleted(@Query('skip') skip: number, @Query('size') size?: number): Promise<novels[]> {
    return await this.sqlnovelsService.getBooksByCompleted(+skip, size ? +size : 20);
  }

  // 根据热门推荐书 list
  @Get('getBooksByHot')
  async getBooksByHot(@Query('skip') skip: number, @Query('size') size?: number): Promise<recommends[]> {
    return await this.sqlrecommendsService.getList(+skip, +size);
  }

  // 前100个里随机取 size 个 推荐书
  @Get('getRecommendBooks')
  async getRecommendBooks(@Query('size') size?: number): Promise<recommends[]> {
    const _size = +size || 4
    const list = await this.sqlrecommendsService.getList(0, 100);
    return shuffle(list).slice(0, _size)
  }

  filterRecommendBooks(list: any[], id: number): any[] {
    if (list.length) {
      const filterList = list.map((item, index) => item.id === +id ? index : undefined).filter((v) => v !== undefined)
      if (filterList.length) {
        list.splice(filterList[0], 1)
      } else {
        list.splice(-1, 1)
      }
    }
    return list
  }

  // 获取书信息，缓存一下
  @Get('getBookById')
  async getBookById(@Query('id') id: number, @Query('skip') skip?: number): Promise<[novels, menus[], menus[], number, any[]]> {
    const novel = await this.sqlnovelsService.findById(+id, true)
    const [menus, total] = await this.getMenusByBookId(id, +skip, 100, 0)
    const [DescMenus] = total > 40 ? await this.getMenusByBookId(id, 0, 5, 1) : [[]]
    const recommendBooks = await this.getRecommendBooks()
    return [novel, menus, DescMenus, total, this.filterRecommendBooks(recommendBooks, id)]
  }

  // skip： 从第几个开始，不是从第几页开始
  @Get('getMenusByBookId')
  async getMenusByBookId(@Query('id') id: number, @Query('skip') skip: number, @Query('size') size?: number, @Query('desc') desc?: string | number): Promise<[menus[], number]> {
    return await this.sqlmenusService.getMenusByBookId(+id, +skip, +size, Boolean(+desc));
  }

  // 获取当前目录前面的目录或者后面的目录
  @Get('getPrevNextMenus')
  async getPrevNextMenus(@Query('id') id: number, @Query('novelId') novelId: number, @Query('isPrev') isPrev?: string | number): Promise<menus[]> {
    if (+isPrev) {
      return await this.sqlmenusService.getPrevMenus(+id, +novelId, 50, true);
    } else {
      return await this.sqlmenusService.getNextMenus(+id, +novelId);
    }
  }

  // page 页数据获取
  @Get('getPageById')
  async getPageById(@Query('id') id: number, @Query('onlypage') onlypage: number): Promise<any> {
    // @TODO: 考虑 id 错误的问题，其他接口也一样
    let page: any = await this.sqlpagesService.findOne(+id)
    if (!page || !page.id) {
      page = await this.sqlmenusService.findOne(+id)
      if (!page) {
        return []
      } else {
        // http://localhost:3010/page/388340
        this.logger.start(`{novelId: ${page.novelId}, id: ${page.id} }`, this.logger.createPageLoseErrorLogFile())
        this.logger.writeLog()
        page["noPage"] = true
      }
    }

    if (page && page.id) {
      const novel = await this.sqlnovelsService.findById(page.novelId, true)
      if (novel && novel.title) {
        page['title'] = novel.title
        page['typename'] = novel.typename
        page['author'] = novel.author
        page['isComplete'] = novel.isSpiderComplete
      } else {
        page['title'] = ''
      }
      const menus = onlypage ? [] : await this.sqlmenusService.getPrevNextMenus(page.id, page.novelId)
      const recommendBooks = onlypage ? [] : await this.getRecommendBooks()

      return [page, menus, this.filterRecommendBooks(recommendBooks, novel.id)]
    }

    return []
  }

  // 查询作者书list
  @Get('getAuthorData')
  async getAuthorData(@Query('id') id: number): Promise<[novels[], authors[]]> {
    let novelsList = []
    if (id) {
      const author = await this.sqlauthorsService.findOne(+id)
      if (author) {
        novelsList = await this.sqlnovelsService.getBookByIds(author.novelIds)
      }
    }
    const authorsList = await this.sqlauthorsService.getAuthors(0, 20)
    return [
      novelsList,
      authorsList
    ]
  }
}
