import { sqlerrors } from './../sqlerrors/sqlerrors.entity';
import { getHost } from '../utils/index'
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FixdataService } from './fixdata.service';
import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { SqltypesService } from '../sqltypes/sqltypes.service';
import { SqlmenusService } from '../sqlmenus/sqlmenus.service';
import { SqlpagesService } from '../sqlpages/sqlpages.service';
import { SqlrecommendsService } from '../sqlrecommends/sqlrecommends.service';
import { SqltypesdetailService } from '../sqltypesdetail/sqltypesdetail.service';
import { SqlauthorsService } from '../sqlauthors/sqlauthors.service';
import { SqlerrorsService } from '../sqlerrors/sqlerrors.service';
import { TumorTypes, SqltumorService } from '../sqltumor/sqltumor.service';

import { sqlnovels as novels } from '../sqlnovels/sqlnovels.entity';
import { sqlauthors as authors } from '../sqlauthors/sqlauthors.entity';
import { Mylogger } from '../mylogger/mylogger.service';

const isNumber = (num: any) => {
  if (typeof num === 'number') {
    return true
  }
  return typeof num === 'string' && /^\d+$/.test(num)
}

@Controller('fixdata')
export class FixdataController {
  private readonly logger = new Mylogger(FixdataController.name);

  constructor(
    private readonly fixdataService: FixdataService,
    private readonly sqlnovelsService: SqlnovelsService,
    private readonly sqltypesService: SqltypesService,
    private readonly sqlmenusService: SqlmenusService,
    private readonly sqlpagesService: SqlpagesService,
    private readonly sqlauthorsService: SqlauthorsService,
    private readonly sqlerrorsService: SqlerrorsService,
    private readonly sqltumorService: SqltumorService,
    private readonly sqlrecommendsService: SqlrecommendsService,
    private readonly sqltypesdetailService: SqltypesdetailService,
  ) { }



  @Get('getBookInfo')
  async getBookInfo(@Query('id') id: string, @Query('noRealMenus') noRealMenus?: boolean): Promise<novels | string> {
    if (isNumber(id)) {
      const novel = await this.sqlnovelsService.findById(+id, true);
      if (novel && !noRealMenus) {
        // @TODO: 获取实际总章节数，并提供修复按钮，不重要
      }
      return novel
    } else {
      return 'id 类型不对'
    }
  }

  @Post('deleteBook')
  async deleteBook(@Body('id') id: string): Promise<any> {
    if (isNumber(id)) {
      const _id = +id
      // 删除 book 表
      const novel = await this.sqlnovelsService.findById(_id)
      await this.sqlnovelsService.remove(_id)
      const _novel = await this.sqlnovelsService.findById(_id)
      let res = ''
      let text = ''
      if (_novel && _novel.id) {
        res = '书本表数据删除失败，'
        console.log(res)
      } else {
        res = `书本表数据(id: ${_id})删除成功，`
        console.log(res)
      }

      // 删除 author 表中关联数据
      const author = await this.sqlauthorsService.findOne(novel.authorId)
      text = author.novelIds.includes(_id) ? `开始删除 author 表中对应的书id，` : 'author 表里并没有书id(哈?)，'
      res += text
      console.log(text)
      author.novelIds = author.novelIds.filter((id) => id != _id)
      await this.sqlauthorsService.updateAuthor(author)

      // 删除 typesdetail 中的关联数据
      const typesdetails = await this.sqltypesdetailService.getAllByNovelId(_id)
      text = `typesdetail里 共${typesdetails.length}条数据要删除，`
      res += text
      console.log(text)
      while (typesdetails.length) {
        const { id } = typesdetails.shift()
        await this.sqltypesdetailService.remove(id)
      }

      // 删除推荐
      const recommend = await this.sqlrecommendsService.findById(_id)
      if (recommend && recommend.index) {
        text = `本书为删除推荐数据，`
        res += text
        console.log(text)

        await this.sqlrecommendsService.remove(recommend.index)
      }

      // 删除 error 表关联数据
      const errors = await this.sqlerrorsService.getAllSqlerrorsByNovelId(_id)
      text = `错误数据共${errors.length}条要删除，`
      res += text
      console.log(text)
      while (errors.length) {
        const { id } = errors.shift()
        await this.sqlerrorsService.remove(id)
      }

      // 删除 menus 表
      const menus = await this.sqlmenusService.findAll(_id)
      text = `共${menus.length}章要删除，`
      res += text
      console.log(text)
      while (menus.length) {
        const { id } = menus.shift()
        await this.sqlmenusService.remove(id)
        await this.sqlpagesService.remove(id)
      }

      return res
    } else {
      return 'id 类型不对'
    }
  }

  @Post('modifyBookInfo')
  async modifyBookInfo(@Body('id') id: string, @Body('fieldName') fieldName: string, @Body('fieldValue') fieldValue: string) {
    if (isNumber(id)) {
      const _fieldValue: any = ['isComplete', 'isSpiderComplete'].includes(fieldName) ? Boolean(fieldValue) : fieldValue
      const fileds = { [fieldName]: _fieldValue }
      let newAuthor = null
      let bookInfo = null
      if (fieldName === 'authorId') {
        newAuthor = await this.getAuthorInfo(fieldValue)
        if (!newAuthor) {
          return 'authorId 不正确'
        }
        bookInfo = await this.getBookInfo(id, true)
        fileds.author = newAuthor.name
      }
      const res = await this.sqlnovelsService.updateFields(+id, fileds) || '';
      if (fieldName === 'authorId' && res && typeof res === 'object' && bookInfo) {
        const oldAuthor: any = await this.getAuthorInfo(bookInfo.authorId);
        if (oldAuthor) {
          oldAuthor.novelIds = oldAuthor.novelIds.filter((id) => id != bookInfo.id)
          await this.sqlauthorsService.updateAuthor(oldAuthor)
        }
        if (!newAuthor.novelIds.includes(`${bookInfo.id}`)) {
          newAuthor.novelIds.push(bookInfo.id)
          await this.sqlauthorsService.updateAuthor(newAuthor)
        }
      }
      return typeof res === 'string' ? res : (res ? '' : '修改失败');
    } else {
      return 'bookId 类型不对'
    }
  }

  @Get('getAuthorInfo')
  async getAuthorInfo(@Query('id') id: string): Promise<authors | authors[]> {
    if (isNumber(id)) {
      return await this.sqlauthorsService.findOne(+id);
    }
    return await this.sqlauthorsService.findByAuthorName(id);
  }

  // @Post('modifyAuthorInfo')
  // async modifyAuthorInfo(@Body('id') id: number, @Body('field') field: number) {
  //   const book = await this.sqlnovelsService.findById(+id, true);
  // }

  @Get('getTumorTypes')
  async getTumorTypes(): Promise<any> {
    return TumorTypes
  }

  @Get('getTumorList')
  async getTumorList(@Query('host') host: string): Promise<any[]> {
    return await this.sqltumorService.findList(host.trim());
  }

  @Post('deleteTumor')
  async deleteTumor(@Body('id') id: number): Promise<string> {
    return await this.sqltumorService.remove(+id) ? '' : '删除失败';
  }

  @Post('addTumor')
  async addTumor(@Body('type') type: string, @Body('host') host: string, @Body('text') text: string): Promise<string> {
    const tumor = await this.sqltumorService.create({ type, host: getHost(host), text })
    return typeof tumor === 'string' ? tumor : (tumor ? '' : '添加失败');
  }
}
