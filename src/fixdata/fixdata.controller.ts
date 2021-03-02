import { sqlspider } from './../sqlspider/sqlspider.entity';
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
import { ISpiderStatus, SqlspiderService, CreateSqlspider } from '../sqlspider/sqlspider.service';

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
    private readonly sqlspiderService: SqlspiderService,
    private readonly sqlrecommendsService: SqlrecommendsService,
    private readonly sqltypesdetailService: SqltypesdetailService,
  ) { }

  @Get('getLastBookList')
  async getLastBookList(): Promise<novels[]> {
    return await this.sqlnovelsService.getLastBooks(100)
  }

  @Get('getBookInfo')
  async getBookInfo(@Query('id') id: string): Promise<any> {
    if (isNumber(id)) {
      const novel: any = await this.sqlnovelsService.findById(+id, true);
      const recommend = await this.sqlrecommendsService.findById(+id)
      if (novel) {
        novel.isRecommend = !!recommend
        const menusLen = await this.sqlmenusService.findCountByNovelId(+id);
        // 如果数量不对，自动更新一下
        if (menusLen != novel.menusLen) {
          await this.sqlnovelsService.updateFields(+id, {
            menusLen,
          })
        }
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
      await this.sqltypesdetailService.removeByNovelId(_id)
      text = `删除 typesdetails 里的数据，`
      res += text
      console.log(text)

      // 删除推荐
      const recommend = await this.sqlrecommendsService.findById(_id)
      if (recommend && recommend.index) {
        text = `本书为删除推荐数据，`
        res += text
        console.log(text)

        await this.sqlrecommendsService.remove(recommend.index)
      }

      // 删除 error 表关联数据
      await this.sqlerrorsService.removeByNovelId(_id)
      text = `删除errors表里数据，`
      res += text
      console.log(text)

      // 删除 menus 表
      await this.sqlmenusService.removeByNovelId(_id)
      await this.sqlpagesService.removeByNovelId(_id)
      text = `删除menus和pages表里数据，`
      res += text
      console.log(text)

      // 删除 spider 表
      await this.deleteSpiderData(_id)
      text = `删除spider表里数据，`
      res += text
      console.log(text)

      return res
    } else {
      return 'id 类型不对'
    }
  }
  @Post('setRecommend')
  async setRecommend(@Body('id') id: string, @Body('toRec') toRec: string) {
    const novel = await this.sqlnovelsService.findById(+id, true);
    if (!novel || !novel.id) {
      return '找不到书本信息'
    }
    const { title, description, author, authorId, thumb } = novel
    const oRec = await this.sqlrecommendsService.findById(+id)
    if (!oRec || !oRec.index) {
      if (toRec) {
        const level = await this.sqlrecommendsService.findLastLevel()
        return await this.sqlrecommendsService.create({
          id: +id,
          level: level + 1,
          title,
          description: description.length > 990 ? description.substr(0, 990) : description,
          author,
          authorId,
          thumb,
        }) ? '' : '设置失败';
      } else {
        return '找不到本书的推荐信息'
      }
    } else if (!toRec) {
      return await this.sqlrecommendsService.remove(oRec.index) ? '' : '设置失败'
    }
  }

  async deleteSpiderData(id: number) {
    return await this.sqlspiderService.remove(id)
  }

  @Post('modifyBookInfo')
  async modifyBookInfo(@Body('id') id: string, @Body('fieldName') fieldName: string, @Body('fieldValue') fieldValue: string) {
    if (isNumber(id)) {
      const _fieldValue: any = ['isComplete', 'isSpiderComplete'].includes(fieldName) ? Boolean(fieldValue) : fieldValue
      const fileds = { [fieldName]: _fieldValue }
      let newAuthor = null
      const bookInfo = await this.getBookInfo(id)
      if (fieldName === 'isSpiderComplete') {
        if (_fieldValue) {
          await this.deleteSpiderData(+id)
        } else {
          await this.sqlspiderService.create(+id)
        }
      } else if (fieldName === 'authorId') {
        newAuthor = await this.getAuthorInfo(fieldValue)
        if (!newAuthor) {
          return 'authorId 不正确'
        }
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

  @Post('modifyMenuIndex')
  async modifyMenuIndex(@Body('id') id: number, @Body('value') value: number, @Body('errorId') errorId: number): Promise<string> {
    const menuInfo = await this.sqlmenusService.findOne(+id)
    if (menuInfo) {
      menuInfo.index = +value
      await this.sqlmenusService.save(menuInfo)
    }
    // @TODO: page 表中一些字段干掉，减轻表负担，用 menu 中字段就好
    const pageInfo = await this.sqlpagesService.findOne(+id)
    if (pageInfo) {
      pageInfo.index = +value
      await this.sqlpagesService.save(pageInfo)
    }

    return await this.sqlerrorsService.remove(+errorId) ? '' : '更改失败';
  }

  @Get('getAuthorInfo')
  async getAuthorInfo(@Query('id') id: string): Promise<authors | authors[]> {
    if (isNumber(id)) {
      return await this.sqlauthorsService.findOne(+id);
    }
    return await this.sqlauthorsService.findByAuthorName(id);
  }

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

  // @TODO: 用完后注释掉吧，修复一下未创建 sqlspider 之前的数据
  @Post('initSpiderData')
  async initSpiderData() {
    const unCompleteSpiderBooks = await this.sqlnovelsService.getUnCompleteSpiderNovels()
    while (unCompleteSpiderBooks.length) {
      const { id } = unCompleteSpiderBooks.shift()
      await this.sqlspiderService.create(id, ISpiderStatus.SPIDERED)
    }
  }
}
