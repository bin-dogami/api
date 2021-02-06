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
import { sqlmenus as menus } from '../sqlmenus/sqlmenus.entity';
import { sqlrecommends as recommends } from '../sqlrecommends/sqlrecommends.entity';

import { Mylogger } from '../mylogger/mylogger.service';

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
    private readonly sqlrecommendsService: SqlrecommendsService,
    private readonly sqltypesdetailService: SqltypesdetailService,
  ) { }

  @Get('getTypesData')
  async getTypesData(@Query('id') id: number): Promise<any> {
    const types = await this.sqltypesService.findAll(false)
    const list = await this.getBooksByType(id, 0, 5)
    return {
      types,
      list
    }
  }

  @Get('getIndexData')
  async getIndexData(): Promise<any> {
    // @TODO: 推荐或者个人浏览记录
    // 热门小说
    const types = await this.sqltypesService.findAll(false)
    const typesData = [];
    for (const { id, name } of types) {
      const books = await this.sqlnovelsService.getIndexBooksByType(id)
      typesData.push({
        id,
        name,
        books
      })
    }
    return {
      typesData,
    }
  }

  // 根据分类获取书list，skip： 从第几个开始，不是从第几页开始
  @Get('getBooksByType')
  async getBooksByType(@Query('typeId') typeId: number, @Query('skip') skip: number, @Query('size') size?: number): Promise<[novels[], number]> {
    return await this.sqlnovelsService.getBooksByType(+typeId, +skip, +size);
  }

  // 根据推荐书 list
  @Get('getRecommendBooks')
  async getRecommendBooks(@Query('skip') skip: number, @Query('size') size?: number): Promise<[recommends[], number]> {
    return await this.sqlrecommendsService.getList(+skip, +size);
  }

  // 获取书信息，缓存一下
  @Get('getBookById')
  async getBookById(@Query('id') id: number): Promise<[novels, menus[], menus[], number, any[]]> {
    const novel = await this.sqlnovelsService.findById(+id, false)
    const [menus, total] = await this.getMenusByBookId(id, 0, 100, 0)
    // @TODO: total > 40
    const [DescMenus] = total > 0 ? await this.getMenusByBookId(id, 0, 5, 1) : [[]]
    const [recommendBooks] = await this.getRecommendBooks(0, 3)
    return [novel, menus, DescMenus, total, recommendBooks]
  }

  // skip： 从第几个开始，不是从第几页开始
  @Get('getMenusByBookId')
  async getMenusByBookId(@Query('id') id: number, @Query('skip') skip: number, @Query('size') size?: number, @Query('desc') desc?: string | number): Promise<[menus[], number]> {
    return await this.sqlmenusService.getMenusByBookId(+id, +skip, +size, Boolean(+desc));
  }
}
