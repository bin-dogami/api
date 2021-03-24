import { sqlspider } from './../sqlspider/sqlspider.entity';
import { sqlerrors } from './../sqlerrors/sqlerrors.entity';
import { getHost, unique, toClearTakeValue } from '../utils/index'
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
import { ISpiderStatus, SqlspiderService, SpiderStatus } from '../sqlspider/sqlspider.service';
const dayjs = require('dayjs')

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
  clearingAllBooksContents = false;

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

  @Get('getBookList')
  async getBookList(@Query('skip') skip: string, @Query('size') size: string, @Query('desc') desc: string, @Query('complete') complete: string, @Query('completeSpider') completeSpider: string): Promise<[novels[], number]> {
    const _skip = +skip
    const _size = +size
    const params: any = { where: {} }
    if (+complete > 1) {
      params.where.isComplete = complete === '2'
    }

    if (+completeSpider > 1) {
      params.where.isSpiderComplete = completeSpider === '2'
    }
    return await this.sqlnovelsService.getBooksByParams({
      ...params,
      order: {
        id: desc === '1' ? "DESC" : "ASC",
      },
      skip: _skip,
      take: _size ? Math.min(100, _size) : 10,
    })
  }

  // 模糊查询
  @Get('getBookByName')
  async getBookByName(@Query('name') name: string): Promise<novels[]> {
    return await this.sqlnovelsService.getBookByTitleWithLike(name)
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
      return this.getBookByName(id)
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

      this.logger.start(`### 【start】 开始删除书信息（时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}） ###`, this.logger.createDeleteBookLogFile())
      if (_novel && _novel.id) {
        res = '书本表数据删除失败，'
      } else {
        res = `书本表数据(id: ${_id})删除成功，`
      }
      this.logger.log(`# ${res} #`)

      // 删除 author 表中关联数据
      const author = await this.sqlauthorsService.findOne(novel.authorId)
      text = author && author.novelIds.includes(_id) ? `开始删除 author 表中对应的书id，` : 'author 表里并没有书id(哈?)，'
      res += text
      this.logger.log(`# ${text} #`)
      if (author) {
        author.novelIds = author.novelIds.filter((id) => id != _id)
        await this.sqlauthorsService.updateAuthor(author)
      }

      // 删除 typesdetail 中的关联数据
      await this.sqltypesdetailService.removeByNovelId(_id)
      text = `删除 typesdetails 里的数据，`
      res += text
      this.logger.log(`# ${text} #`)


      // 删除推荐
      const recommend = await this.sqlrecommendsService.findById(_id)
      if (recommend && recommend.index) {
        text = `本书为删除推荐数据，`
        res += text
        this.logger.log(`# ${text} #`)

        await this.sqlrecommendsService.remove(recommend.index)
      }

      // 删除 error 表关联数据
      await this.sqlerrorsService.removeByNovelId(_id)
      text = `删除errors表里数据，`
      res += text
      this.logger.log(`# ${text} #`)

      // 删除 menus 表
      await this.sqlmenusService.removeByNovelId(_id)
      await this.sqlpagesService.removeByNovelId(_id)
      text = `删除menus和pages表里数据，`
      res += text
      this.logger.log(`# ${text} #`)

      // 删除 spider 表
      await this.deleteSpiderData(_id)
      text = `删除spider表里数据，`
      res += text
      this.logger.end(`### 【end】删除书本信息完成 ${text} ### \n\n\n`);

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

  // 设置书本为全本并且抓取完了
  @Post('setBookSpiderComplete')
  async setBookSpiderComplete(@Body('id') id: string): Promise<string> {
    const novel = await this.sqlnovelsService.findById(+id, true)
    if (!novel) {
      return '找不到这本书了'
    }

    if (novel.isComplete && novel.isSpiderComplete) {
      return '这本书已经是完本且已经抓完了，不用再设置了'
    }

    return await this.sqlnovelsService.updateFields(+id, {
      isComplete: true,
      isSpiderComplete: true,
    }) && ''
  }

  @Post('modifyMenuIndex')
  async modifyMenuIndex(@Body('id') id: number, @Body('value') value: number, @Body('errorId') errorId: number): Promise<string> {
    const menuInfo = await this.sqlmenusService.findOne(+id)
    if (menuInfo) {
      menuInfo.index = +value
      await this.sqlmenusService.save(menuInfo)
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

  // 获取目录信息
  @Get('getMenuInfo')
  async getMenuInfo(@Query('id') id: string): Promise<any> {
    if (isNumber(id)) {
      const menu: any = await this.sqlmenusService.findOne(+id);
      if (!menu) {
        return '获取不到目录信息'
      }
      const page: any = await this.sqlpagesService.findOne(+id);
      menu.page = page
      menu.content = page ? page.content.substr(0, 50) : ''
      menu.wordsnum = page ? page.wordsnum : 0
      return menu
    } else {
      return 'id 类型不对'
    }
  }

  @Post('modifyMenuInfo')
  async modifyMenuInfo(@Body('id') id: string, @Body('fieldName') fieldName: string, @Body('fieldValue') fieldValue: string) {
    if (isNumber(id)) {
      const fileds = { [fieldName]: fieldValue }
      const menu = await this.sqlmenusService.findOne(+id);
      await this.sqlmenusService.save({ ...menu, ...fileds });
      // const page = await this.sqlpagesService.findOne(+id);
      // await this.sqlpagesService.save({ ...page, ...fileds });
      return ''
    } else {
      return 'bookId 类型不对'
    }
  }

  // 删除目录信息
  @Post('deleteMenu')
  async deleteMenu(@Body('id') id: string): Promise<any> {
    if (isNumber(id)) {
      const menu = await this.sqlmenusService.findOne(+id);
      try {
        await this.sqlpagesService.remove(+id);
      } catch (error) {
        //
      }

      if (menu) {
        await this.sqlmenusService.remove(+id);

        // 更新书中目录数
        const menusLen = await this.sqlmenusService.findCountByNovelId(menu.novelId);
        await this.sqlnovelsService.updateFields(menu.novelId, {
          menusLen,
        })

        // 删除所有 error 中 目录相关的
        await this.sqlerrorsService.removeByMenuId(+id)
      }
      return ''
    } else {
      return 'bookId 类型不对'
    }
  }

  // 删除大于等于目录id 的所有目录
  @Post('batchDeleteGtMenu')
  async batchDeleteGtMenu(@Body('id') id: string): Promise<any> {
    if (isNumber(id)) {
      const menu = await this.sqlmenusService.findOne(+id);
      const page = await this.sqlpagesService.findOne(+id);

      if (page) {
        await this.sqlpagesService.batchDeleteGtPages(+id, page.novelId);
      }

      if (menu) {
        await this.sqlmenusService.batchDeleteGtMenus(+id, menu.novelId);

        // 更新书中目录数
        const menusLen = await this.sqlmenusService.findCountByNovelId(menu.novelId);
        await this.sqlnovelsService.updateFields(menu.novelId, {
          menusLen,
        })

        // 删除所有 error 中 目录相关的
        await this.sqlerrorsService.batchDeleteGtMenus(+id, page.novelId)
      }
      return ''
    } else {
      return 'bookId 类型不对'
    }
  }

  @Get('getTumorTypes')
  async getTumorTypes(): Promise<any> {
    return TumorTypes
  }

  @Get('getTumorList')
  async getTumorList(@Query('host') host: string, @Query('useFix') useFix: string): Promise<any[]> {
    return await this.sqltumorService.findList(Boolean(+useFix), host.trim());
  }

  @Post('deleteTumor')
  async deleteTumor(@Body('id') id: number): Promise<string> {
    return await this.sqltumorService.remove(+id) ? '' : '删除失败';
  }

  // 修正一本书中所有章节内容，替换掉不需要的词/语句
  @Post('fixPagesContent')
  async fixPagesContent(@Body('id') id: string, @Body('text') text: string): Promise<any> {
    const pages = await this.sqlpagesService.findAll(+id)
    if (!pages || !pages.length) {
      return '找不到目录'
    }
    while (pages.length) {
      const page = pages.shift()
      page.content = page.content.replace(text, '')
      try {
        // @TODO: 加个结束的记录？再次更新 content 的时候判断一下
        // @TODO: 写一个方法，能探查所有内容都被替换干净了，有点麻烦
        await this.sqlpagesService.save(page)
      } catch (error) {
        //
      }
    }
    return ''
  }

  // @TODO: 一次性清理所有的书的章节内容，用完就注释掉吧
  @Get('clearAllBooks')
  async clearAllBooks(): Promise<string> {
    if (this.clearingAllBooksContents) {
      return '已经在替换了'
    }
    this.clearingAllBooksContents = true
    const [books, count] = await this.sqlnovelsService.getBooksWhereLtId(43495)   // 43495
    while (books.length) {
      const { id, title } = books.shift()
      const pages = await this.sqlpagesService.findAll(+id)
      if (!pages || !pages.length) {
        continue
      }
      console.log(`------------------------   ${id}(${title})正在开始清理所有章节内容，共${pages.length}章   -------------------------`)
      const tumorList = await this.getTumorList('', '1')
      while (pages.length) {
        const page = pages.shift()
        tumorList.forEach(({ text }) => {
          page.content = page.content.replace(text, '')
        })
        try {
          await this.sqlpagesService.save(page)
        } catch (error) {
          //
        }
      }
    }
    this.clearingAllBooksContents = false
    return '没有id小于 43495 的书需要替换'
  }

  @Post('addTumor')
  async addTumor(@Body('type') type: string, @Body('host') host: string, @Body('text') text: string, @Body('useFix') useFix: string): Promise<string> {
    const tumor = await this.sqltumorService.create({
      type,
      text,
      useFix: Boolean(+useFix),
      host: getHost(host)
    })
    return typeof tumor === 'string' ? tumor : (tumor ? '' : '添加失败');
  }

  // 上一次抓取的最后的目录这次抓取不到了
  @Get('getErrorsByType')
  async getErrorsByType(@Query('type') type: string) {
    const list = await this.sqlerrorsService.getErrorsByType(type);
    const novelIds = list.map(({ novelId }) => novelId)
    const books = await this.sqlnovelsService.getBookByIds(unique(novelIds))
    books.length && list.forEach((item) => {
      const fBook = books.filter((b) => b.id === item.novelId)
      if (fBook.length) {
        Object.assign(item, {
          title: fBook[0].title
        })
      }
    })
    return list
  }

  // 删除errors表里数据
  @Post('deleteErrorData')
  async deleteErrorData(@Body('id') id: number): Promise<string> {
    return await this.sqlerrorsService.remove(+id) ? '' : '删除失败';
  }

  // 抓取状态
  @Get('getSpiderStatus')
  async getSpiderStatus(): Promise<any[]> {
    return Object.keys(SpiderStatus).map((value) => {
      return {
        value,
        label: SpiderStatus[value]
      }
    })
  }

  // 抓取状态List
  @Get('getSpiderList')
  async getSpiderList(@Query('status') status: string): Promise<any[]> {
    const _status = +status
    const spiders = await this.sqlspiderService.findAllByStatus(_status, 100)
    const ids = spiders.map(({ id }: { id: number }) => id)
    const novels = await this.sqlnovelsService.getBookByIds(ids)
    const _novels = {}
    novels.forEach((item) => {
      _novels[item.id] = item
    })
    spiders.forEach((item) => {
      if (item.id in _novels) {
        item.title = _novels[item.id].title
        item.statusText = SpiderStatus[item.status] || 'status 值错误'
      }
    })
    return spiders
  }

  // 更改抓取状态
  @Post('changeSpiderStatus')
  async changeSpiderStatus(@Body('id') id: string, @Body('status') status: string): Promise<string> {
    const spider = await this.sqlspiderService.getById(+id)
    if (!spider) {
      return '找不到这条数据了'
    }

    if (status in SpiderStatus) {
      spider.status = +status
      return await this.sqlspiderService.update(spider) && ''
    } else {
      return 'status 类型不对'
    }
  }

  // 查看总共有多少本书了
  @Get('viewTotalBooks')
  async viewTotalBooks(): Promise<string> {
    const total = await this.sqlnovelsService.getTotal()
    return `共${total}本书`
  }

  // 查看总共有多少个目录了
  @Get('viewTotalMenus')
  async viewTotalMenus(): Promise<string> {
    const total = await this.sqlmenusService.getTotal()
    return `共${total}个目录`
  }

  @Get('getMenuList')
  async getMenuList(@Query('id') id: string, @Query('skip') skip: string, @Query('size') size: string, @Query('desc') desc: string): Promise<any[]> {
    return await this.sqlmenusService.getMenusByBookId(+id, +skip, +size, Boolean(+desc), true)
  }

  // 更改抓取状态
  @Post('batchModifyIndexs')
  async batchModifyIndexs(@Body('mId') mId: string, @Body('nId') nId: string): Promise<string> {
    if (isNumber(mId) && isNumber(nId)) {
      const menu = await this.sqlmenusService.findOne(+mId)
      if (!menu) {
        return `找不到${mId}对应的目录，`
      } else if (menu.index <= 0) {
        return `目录index 必须大于0`
      } else {
        let index = menu.index
        const menuList = await this.sqlmenusService.getNextMenus(+mId, +nId, toClearTakeValue, true)
        while (menuList.length) {
          const menu = menuList.shift()
          if (menu.index <= 0) {
            continue
          }
          index++
          menu.index = index
          await this.sqlmenusService.save(menu)
        }
        return ''
      }
    } else {
      return '目录id或书id不对'
    }
  }

  @Get('detectBookIndexAbnormal')
  async detectBookIndexAbnormal(@Query('id') id: string): Promise<string | any[]> {
    let menus = await this.sqlmenusService.findAll(+id)
    let res = ''
    let i = 0
    let abnormals = []
    // 查询有 index 的目录数
    let indexCount = 0
    // 不需要排序
    // menus = menus.sort((item1: any, item2: any) => {
    //   return item1.index - item2.index;
    // })
    menus.forEach(({ id, index, mname }, key) => {
      if (index <= 0) {
        return
      }
      indexCount++

      i++
      if (i !== index) {
        const lastMenu = key > 0 ? menus[key - 1] : null
        abnormals.push({
          id,
          index,
          mname,
          lastId: lastMenu ? lastMenu.id : '',
          lastIndex: lastMenu ? lastMenu.index : '',
          lastMname: lastMenu ? lastMenu.mname : '',
        })
        // 重置一下index，更精确定位问题 index
        i = index
      }
    })
    if (indexCount === 0) {
      return '这本书一个有index 的目录都没有'
    }
    return abnormals.length ? abnormals : res
  }
}
