import { getNovelId } from '../utils/index';
import { getHost, getValidUrl, getHostFromUrl, unique, toClearTakeValue, downloadImage, writeImage, ImagePath, getMenuId, isNumber } from '../utils/index'
import { Controller, Get, Post, Body, Param, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Fixdata2Service } from './fixdata2.service';
import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { SqltypesService } from '../sqltypes/sqltypes.service';
import { SqlmenusService } from '../sqlmenus/sqlmenus.service';
import { SqlpagesService } from '../sqlpages/sqlpages.service';
import { SqlrecommendsService } from '../sqlrecommends/sqlrecommends.service';
import { SqltypesdetailService } from '../sqltypesdetail/sqltypesdetail.service';
import { SqlauthorsService } from '../sqlauthors/sqlauthors.service';
import { IErrors, SqlerrorsService } from '../sqlerrors/sqlerrors.service';
import { TumorTypes, SqltumorService } from '../sqltumor/sqltumor.service';
import { ISpiderStatus, SqlspiderService, SpiderStatus } from '../sqlspider/sqlspider.service';
import { SqlvisitorsService } from '../sqlvisitors/sqlvisitors.service';
import { SqldatahandlerService, IDataHandler, pageInvalidPlaceholderText } from '../sqldatahandler/sqldatahandler.service';
import { SitemapService } from '../sitemap/sitemap.service';
import { GetBookService } from '../getbook/getbook.service';
import { CommonService } from '../common/common.service';
import { SqlhostspiderstructorService } from '../sqlhostspiderstructor/sqlhostspiderstructor.service';
import { Cron, Interval } from '@nestjs/schedule';

// var crawler = require("../../spider/modules/crawler/index");

// const dayjs = require('dayjs')

import { sqlnovels as novels } from '../sqlnovels/sqlnovels.entity';
import { sqlauthors as authors } from '../sqlauthors/sqlauthors.entity';
import { Mylogger } from '../mylogger/mylogger.service';

@Controller('fixdata2')
export class Fixdata2Controller {
  private readonly logger = new Mylogger(Fixdata2Controller.name);
  clearingAllBooksContents = false;
  isFixAllMenus = false;

  constructor(
    private readonly commonService: CommonService,
    private readonly getBookService: GetBookService,
    private readonly fixdata2Service: Fixdata2Service,
    private readonly sqlnovelsService: SqlnovelsService,
    private readonly sqltypesService: SqltypesService,
    private readonly sqlmenusService: SqlmenusService,
    private readonly sqlpagesService: SqlpagesService,
    private readonly sqlauthorsService: SqlauthorsService,
    private readonly sqlerrorsService: SqlerrorsService,
    private readonly sqltumorService: SqltumorService,
    private readonly sqlspiderService: SqlspiderService,
    private readonly sqlrecommendsService: SqlrecommendsService,
    private readonly sqltypesdetailService: SqltypesdetailService,
    private readonly sqlvisitorsService: SqlvisitorsService,
    private readonly sqldatahandlerService: SqldatahandlerService,
    private readonly sitemapService: SitemapService,
    private readonly sqlhostspiderstructorService: SqlhostspiderstructorService,
  ) { }

  @Post('addSpiderHostObj')
  async addSpiderHostObj(@Body('host') host: string, @Body('title') title: string, @Body('description') description: string, @Body('author') author: string, @Body('thumb') thumb: string, @Body('type') type: string, @Body('menus') menus: string, @Body('mname') mname: string, @Body('content') content: string): Promise<any> {
    const data = {
      host,
      title,
      description,
      author,
      thumb,
      type,
      menus,
      mname,
      content,
    }
    try {
      const structor = await this.sqlhostspiderstructorService.findByHost(host)
      if (structor) {
        return await this.sqlhostspiderstructorService.save({ ...structor, ...data })
      } else {
        return await this.sqlhostspiderstructorService.create(data)
      }
    } catch (error) {
      return error
    }
  }

  @Get('getAllSpiderHostObj')
  async getAllSpiderHostObj(): Promise<any[]> {
    return await this.sqlhostspiderstructorService.getAll();
  }

}
