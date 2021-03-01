import { getValidTitle, getHostFromUrl, getHost, getNovelId, getMenuId, downloadImage } from '../utils/index'
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { GetBookService } from './getbook.service';
import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { SqltypesService } from '../sqltypes/sqltypes.service';
import { IMenuErrors, SqlmenusService } from '../sqlmenus/sqlmenus.service';
import { SqlpagesService } from '../sqlpages/sqlpages.service';
import { SqlrecommendsService } from '../sqlrecommends/sqlrecommends.service';
import { SqltypesdetailService } from '../sqltypesdetail/sqltypesdetail.service';
import { SqlauthorsService } from '../sqlauthors/sqlauthors.service';
import { IErrors, SqlerrorsService } from '../sqlerrors/sqlerrors.service';
import { ITumor, formula, SqltumorService } from '../sqltumor/sqltumor.service';
import { Mylogger } from '../mylogger/mylogger.service';
const dayjs = require('dayjs')

const ImagePath = '../web-scan/public/'

const getValidUrl = (host: string, url: string, from: string) => {
  // url 带域名
  if (host.includes(getHost(url))) {
    return url.includes('http') ? url : `http://${url}`
  }
  return /^\//.test(url) ? host + url : `${from}/${url}`
}

@Controller('getbook')
export class GetBookController {
  private readonly logger = new Mylogger(GetBookController.name);
  reSpiderInfo = null;

  constructor(
    private readonly getBookService: GetBookService,
    private readonly sqlnovelsService: SqlnovelsService,
    private readonly sqltypesService: SqltypesService,
    private readonly sqlmenusService: SqlmenusService,
    private readonly sqlpagesService: SqlpagesService,
    private readonly sqlauthorsService: SqlauthorsService,
    private readonly sqlerrorsService: SqlerrorsService,
    private readonly sqltumorService: SqltumorService,
    private readonly sqlrecommendsService: SqlrecommendsService,
    private readonly sqltypesdetailService: SqltypesdetailService,
  ) {
  }

  @Get()
  getHello(): string {
    return this.getBookService.getHello();
  }

  async setRecommend(novel) {
    const { id, title, description, author, authorId, thumb } = novel
    this.logger.log(`# 本书设置为推荐 start #`);
    const level = await this.sqlrecommendsService.findLastLevel()
    await this.sqlrecommendsService.create({
      id,
      level: level + 1,
      title,
      description: description.length > 990 ? description.substr(0, 990) : description,
      author,
      authorId,
      thumb,
    });
    this.logger.log(`# 本书设置为推荐 end #`);
  }

  // 2021-02-28，已用完！！！修复 menus 表中的 from，错误的from 是 novels 表中的from，应改为 pages 中的from
  // 用完先注释掉吧
  // @Get('fixfrom')
  // async fixfrom() {
  //   const allNovels = await this.sqlnovelsService.getAllBooks()
  //   let index = allNovels.length - 1
  //   while (index >= 0) {
  //     const novel = allNovels[index]
  //     const from = novel.from[0]
  //     const res = await this.getMenus(from, 0, '');
  //     const menusInfos: any = await this.sqlmenusService.getMenuByFrom(+novel.id, from)
  //     console.log(`id: ${novel.id}, title: #${novel.title}#, from: #${from}#，需要修改的目录数： ${menusInfos.length}， index：${index} `)
  //     let fixedNum = 0
  //     if (res && Array.isArray(res)) {
  //       const [menus] = res
  //       if (menus.length) {
  //         console.log(`menus.length: ${menus.length}, last menu: ${menus[menus.length - 1].title}|${menus[menus.length - 1].url}|${menus[menus.length - 1].index}`)
  //       }
  //       if (menusInfos.length) {
  //         menusInfos.map(async (menu: any) => {
  //           let hasFixed = false
  //           while (menus.length) {
  //             const currentMenuInfo = menus.shift();
  //             const { url, title } = currentMenuInfo
  //             const host = getHostFromUrl(from);
  //             const _url = getValidUrl(host, url, from)
  //             if (menu.moriginalname === title) {
  //               fixedNum++
  //               hasFixed = true
  //               menu.from = _url
  //               // await this.sqlmenusService.save(menu)
  //               break;
  //             }
  //           }
  //           if (!hasFixed) {
  //             console.log(`第 ${menu.index} 章 #${menu.moriginalname}# 修复失败， #${from}#`)
  //             if (menu.index <= 0) {
  //               await this.sqlmenusService.remove(menu.id)
  //               await this.sqlpagesService.remove(menu.id)
  //               const errors = await this.sqlerrorsService.getPageLostErrors({ novelId: novel.id, menuId: menu.id })
  //               if (errors.length) {
  //                 await this.sqlerrorsService.remove(errors[0].id)
  //               }
  //             }
  //           }
  //         })
  //       }
  //     }
  //     index--
  //   }
  // }

  @Post('spiderBooksNewMenus')
  async spiderBooksNewMenus() {
    const allNovels = await this.sqlnovelsService.getAllBooks()
    // @TODO: 使用map 可能导致同步失效，必须找个合适的办法，建个表或者弄个全局的办法
    allNovels.map(async (novel: any) => {
      const { from } = novel
      await this.spider(from, '', 0)
    })
  }

  // mnum 为暂时只抓取几章，先记入数据库，再慢慢抓取
  @Post('spider')
  async spider(@Body('url') url: string, @Body('recommend') recommend: string, @Body('mnum') mnum: number) {
    const _mnum = mnum ? +mnum : 0
    this.logger.start(`\n ### 【start】 开始抓取书信息 ###`);
    const bookInfo = await this.getBookService.getBookInfo(url);
    if (!bookInfo || bookInfo.err) {
      const err = bookInfo.err ? `(${bookInfo.err})` : ''
      this.logger.log(`# [failed] 抓取书信息出错，失败原因看上一条${err} #`);
      return {
        '错误': `抓取书信息出错${err}`
      };
    }
    const { title, description, thumb, author, type, from } = bookInfo;
    if (!title || !author || !type) {
      this.logger.end(`### [failed]【end】抓取书信息失败，未抓取到 title 或 作者 或 类型 ###  \n\n\n `);
      return bookInfo;
    }
    const filePath = this.logger.log(`# 抓取书信息成功 # 书名: ${title}；作者: ${author}；来源: ${from}； `, {
      bookname: title
    });

    // 查询书信息
    const novel = await this.sqlnovelsService.findByTitle(title, author);
    if (novel) {
      if (+recommend) {
        await this.setRecommend(novel)
      }
      // 查询目录
      const count = await this.sqlmenusService.findCountByNovelId(novel['id']);

      const { id, title, description, author } = novel;
      this.insertMenus({ ...novel, ...{ from: url }, ...{ filePath }, ...{ mnum: _mnum } });
      this.logger.end(`### 【end】本书不是第一次抓取 ### id: ${id}； \n\n `);
      return { '本书不是第一次抓取': '', '已抓取章数': count, id, title, description, author };
    }

    // 查询分类
    this.logger.log(`# 开始查询书所属分类 #`);
    let typeInfo = await this.sqltypesService.findOneByName(type);
    const isTypeCreateNow = !typeInfo;
    if (!typeInfo) {
      this.logger.log(`# 开始创建新分类 #`);
      typeInfo = await this.sqltypesService.create({
        name: type,
        isTag: false
      });
    }

    const lastNovelId = await this.sqlnovelsService.findLastId();
    const currentNovelId = getNovelId(lastNovelId);
    this.logger.log(`# 开始抓取书封面到 image 目录 #`);
    const newThumbPath = await downloadImage(ImagePath + 'images', thumb, currentNovelId)
    const authorInfo = await this.sqlauthorsService.findOneByAuthorName(author);
    let authorId = 0
    if (authorInfo) {
      authorId = authorInfo.id
      if (!authorInfo.novelIds.includes(currentNovelId)) {
        authorInfo.novelIds.push(currentNovelId)
        await this.sqlauthorsService.updateAuthor(authorInfo)
      }
    } else {
      try {
        const authorInfo = await this.sqlauthorsService.create({
          novelIds: [currentNovelId],
          name: author,
          level: 0,
          levelName: '',
        });
        if (authorInfo) {
          authorId = authorInfo.id
        }
      } catch (error) {
        this.logger.log(`# [failed] 创建作者数据失败，作者：[${author}]，错误信息：${error} #`);
      }
    }
    const newNovel = {
      id: currentNovelId,
      title,
      description: description.length > 990 ? description.substr(0, 990) : description,
      author,
      authorId,
      typeid: typeInfo.id,
      typename: typeInfo.name,
      from: [from],
      tags: [],
      thumb: newThumbPath.replace(ImagePath, ''),
    }
    // 写入书信息
    this.logger.log(`# 开始写入书信息 #`);
    let _novel = null
    try {
      _novel = await this.sqlnovelsService.create(newNovel);
      if (_novel && +recommend) {
        await this.setRecommend(_novel)
      }
    } catch (err) {
      this.logger.end(`### [failed] 写入书数据失败：${err} ###`);
      return {
        '错误': `写入书数据失败：${err}`
      };
    }
    // 写入分类详情表
    if (isTypeCreateNow) {
      this.logger.log(`# 开始写入分类详情表 #`);
      await this.sqltypesdetailService.create({
        tid: typeInfo.id,
        isTag: false,
        typename: type,
        novelId: _novel.id
      });
    }
    this.insertMenus({ ..._novel, ...{ from: url }, ...{ filePath }, ...{ mnum: _mnum } });
    this.logger.end(`### 【end】结束抓取/更新书信息 ### \n`);
    return _novel
  }

  async insertMenus(args: any) {
    const lastIndex = await this.sqlmenusService.findLastIndexByNovelId(args.id)
    this.logger.log(`### 上一次抓取的最后的 index 为 ${lastIndex} ###`);
    const res = await this.getMenus(args.from, lastIndex, '');
    if (res && Array.isArray(res)) {
      const [menus] = res
      args.menus = args.mnum > 0 ? menus.slice(0, args.mnum) : menus;
      const host = getHost(args.from)
      const aHost = host.split('.')
      await this.sqltumorService.create({
        type: aHost.length > 2 ? ITumor.ARRAY_REPLACE : ITumor.JUST_REPLACE,
        text: aHost.length > 2 ? `${aHost[0]},${aHost[aHost.length - 1]}` : host,
        host: host
      })
      await this.insertMenuAndPages(args);
    } else {
      const err = res && res.err ? `(${res.err})` : ''
      this.logger.end(`### [failed] 获取目录失败 ${err} ###`);
      return {
        '错误': `获取目录失败 ${err}`
      };
    }
  }

  @Post('getMenus')
  async getMenus(@Body('url') url: string, lastIndex?: number, faildIndex?: string) {
    return await this.getBookService.getMenus(url, lastIndex, faildIndex);
  }

  async insertPageFailed(menuId, novelId, index, from, moriginalname, error) {
    await this.sqlerrorsService.create({
      menuId,
      novelId,
      menuIndex: index,
      type: IErrors.PAGE_LOST,
      info: `第${index}章(${moriginalname}), ${error}, 来源: ${from}`,
    })
  }

  dealContent(list: string[], tumorList: any[]) {
    if (!list || !list.length) {
      return ''
    }

    const splitStr = '$&$#@@@#$&$'
    const content = list.join(splitStr)
    // 直接替换 的排前面，避免 直接替换 的内容部分里含其他类型的
    const _tumorList = tumorList.sort(({ type }) => type === ITumor.JUST_REPLACE ? -1 : 1)
    const _content = formula(content, _tumorList)
    return _content.split(splitStr).map((str) => {
      const _str = str.trim()
      return _str.length ? `<p>${_str}</p>` : false
    }).filter((str) => !!str).join('')
  }

  // insertPages 参数更改要慎重，有两个地方在用
  async insertPages(id, mId, index, moriginalname, from, url, res, menus) {
    const host = getHostFromUrl(from);
    const _url = getValidUrl(host, url, from)
    // 插入page
    try {
      this.logger.log(`# 第${index}章开始抓取数据 # 来源：${_url}`);
      const list = await this.getBookService.getPageInfo(_url);
      if (!list || !Array.isArray(list) || 'err' in list) {
        const err = list && list.err ? `(${list.err})` : ''
        this.logger.log(`### [failed] 获取章节内容失败 ${err}, 目录名：【${moriginalname}】, 是第${index}章 ###`);
        if (res) {
          index > 0 && res.failedIndex.push(index)
          await this.insertPageFailed(mId, id, index, _url, moriginalname, '获取章节内容失败: ' + err)
        }

        return false
      }

      this.logger.log(`# 第${index}章开始插入page #`);
      const tumorList = await this.sqltumorService.findList(getHost(_url));
      const content = this.dealContent(list, tumorList)
      if (res && !menus.length) {
        res.lastPage = `第${index}章: 【${moriginalname}】 <br />${content}`;
      }
      if (!content.trim().length) {
        this.logger.log(`# [failed] 插入章节内容失败，抓到的内容为空或错误 # 目录名：【${moriginalname}】, 是第${index}章, 错误信息：一个字也没抓到 \n`)
        if (res) {
          index > 0 && res.failedIndex.push(index)
          await this.insertPageFailed(mId, id, index, _url, moriginalname, '插入章节内容失败，抓到的内容为空或错误')
        }
        return false
      }
      await this.sqlpagesService.create({
        id: mId,
        index,
        novelId: id,
        mname: getValidTitle(moriginalname),
        content: content,
        wordsnum: content.length,
        from: _url,
      });
      this.logger.log(`# 插入章节内容成功 # 目录名：【${moriginalname}】, 是第${index}章, 字数：${content.length}；id: ${mId} \n`)
      res && res.successLen++
      return true
    } catch (err) {
      this.logger.log(`# [failed] 章节内容插入表中失败: ${err} # 目录名：【${moriginalname}】, 是第${index}章 \n`)
      if (res) {
        index > 0 && res.failedIndex.push(index)
        await this.insertPageFailed(mId, id, index, _url, moriginalname, `章节内容插入表中失败: ${err}`)
      }
      return false
    }
  }

  // 一次性插入多个目录及对应的章节内容
  @Post('insertMenuAndPages')
  async insertMenuAndPages(@Body() args: any) {
    const { id, title, menus, from, filePath } = args;
    const host = getHostFromUrl(from);
    this.logger.start(` ### 【start】开始插入目录及page ###`, filePath);
    this.logger.log(`书名: ${title}`);
    this.logger.log(`本书id: ${id}`);
    this.logger.log(`共 ${menus.length} 章`);
    this.logger.log(`目录来源 ${from} （${host}）`);
    this.logger.log('###############################################\n');
    const res = {
      successLen: 0,
      failedIndex: [],
      lastPage: '获取或插入page失败'
    }
    let currentMenuId = await this.sqlmenusService.findLastIdByNovelId(id)
    // 最小的 index
    let leastIndex = await this.sqlmenusService.findLeastLessThan1000IndexByNovelId(id)
    let menusInsertFailedInfo = ''
    while (menus.length) {
      const currentMenuInfo = menus.shift();
      const { url, title } = currentMenuInfo
      let _index = currentMenuInfo.index
      let ErrorType = 0
      // 可能是 第901、902、903章 了却因果 这样的，需要写入数据库，章节错误
      if (Array.isArray(_index)) {
        _index = _index[0]
        ErrorType = IMenuErrors.MULTI_MENUS_IN_ONE_PAGE
      }
      // index 小于0 的往最小index后面减
      const index = _index <= 0 && leastIndex < 0 ? _index + leastIndex : _index
      let menuInfo: any;
      const host = getHostFromUrl(from);
      const _url = getValidUrl(host, url, from)
      // 插入或获取 index 这一条目录数据
      try {
        currentMenuId = getMenuId(currentMenuId, true)
        menuInfo = await this.sqlmenusService.create({
          id: currentMenuId,
          novelId: id,
          mname: getValidTitle(title),
          moriginalname: title,
          index,
          // @TODO: 建一个后台页面专门手动查看处理问题吧
          ErrorType,
          from: _url,
        });
        this.logger.log(`# 插入目录成功 # 目录名：【${menuInfo.moriginalname}】 是第${index}章；id: ${menuInfo.id}`)
      } catch (err) {
        menuInfo = await this.sqlmenusService.findMenuByNovelIdAndIndex(id, index);
        if (menuInfo && menuInfo.id) {
          const relationMenuName = menuInfo.moriginalname
          const relationMenuId = menuInfo.id
          // @TODO: http://www.paoshuzw.com/1/1017/ 分卷的时候需要再注意一下; 抓取目录的时候分析一下，如果是有分卷的直接中断并通知管理员；还是直接改数据库字段，使用卷；还是直接把重复章节在上一卷基础上累加上去？后面两个都不容易弄
          // 重复了的index，index 设置为 -1000 以下
          let leastIndex = await this.sqlmenusService.findLeastLessThan1000IndexByNovelId(id)
          const _index = leastIndex < -1000 ? leastIndex - 1 : -1001
          this.logger.log(`# 此目录的index异常，需要人工查看 # 目录名：【${title}】，与【${relationMenuName}(id: ${relationMenuId})】 重复。现在改下 index 再重新插入一下，新的 index 为 ${_index}`)
          // currentMenuId = getMenuId(currentMenuId, true)
          menuInfo = await this.sqlmenusService.create({
            id: currentMenuId,
            novelId: id,
            mname: getValidTitle(title),
            moriginalname: title,
            index: _index,
            ErrorType,
            from: _url,
          });
          await this.sqlerrorsService.create({
            menuId: currentMenuId,
            novelId: id,
            menuIndex: _index,
            type: IErrors.MENU_INDEX_ABNORMAL,
            info: `${menuInfo.moriginalname} index 异常，需要人工处理。相关联的 index: ${index}，id: ${relationMenuId}，目录名: ${relationMenuName}`,
          })
        } else {
          this.logger.log(`# [failed] 章节插入错误，中止抓取 # 目录名：【${menuInfo.moriginalname}】, 第${index}章, 目录list来源: ${from} \n`)
          index > 0 && res.failedIndex.push(index)
          menusInsertFailedInfo = '[章节插入错误！！！！！！！ 看上一条错误信息]'
          await this.sqlerrorsService.create({
            menuId: 0,
            novelId: id,
            menuIndex: index,
            type: IErrors.MENU_INSERT_FAILED,
            info: `第${index}章(${menuInfo.moriginalname}) 插入目录失败, 目录list来源: ${from}`,
          })
          break;
        }
      }
      if (!menuInfo || !menuInfo.id) {
        continue;
      }

      await this.insertPages(id, currentMenuId, menuInfo.index, title, from, url, res, menus)
    }
    // novel 表更新
    if (res.successLen) {
      const menusLen = await this.sqlmenusService.findCountByNovelId(id);
      await this.sqlnovelsService.updateFields(id, {
        menusLen,
        updatetime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      })
    }
    this.logger.log(' ############################################### ');
    const failedInfo = menusInsertFailedInfo ? menusInsertFailedInfo : `失败章节 ${res.failedIndex.length} 条（index.）：${res.failedIndex.length ? res.failedIndex.join(', ') : '无'}`
    this.logger.end(`### 【end】完成目录及page插入，插入成功 ${res.successLen} 条，${failedInfo}。 ### \n\n\n`);

    // 抓取章节
    this.reGetPages(id)
    return res
  }

  // 获取失败page对应的书ID列表
  @Get('getFailedPages')
  async getFailedPages() {
    const list = await this.sqlerrorsService.getFailedPageList();
    const ids = list.map(({ id }) => id)
    const books = await this.sqlnovelsService.getBookByIds(ids)
    books.length && list.forEach((item) => {
      const fBook = books.filter((b) => b.id === item.id)
      if (fBook.length) {
        Object.assign(item, fBook[0])
      }
    })
    return list
  }

  // 重新抓取书的失败page
  @Get('reGetPages')
  async reGetPages(@Query('id') id: number) {
    if (!this.reSpiderInfo) {
      this.reSpiderInfo = {
        id,
        index: 0
      }
    }
    const mIds = await this.sqlerrorsService.getAllPageLostByNovelId(id);
    this.reSpiderInfo.index++
    this.logger.start(`\n ### 【start】 开始抓取上次未抓取成功的章节内容，这是第 *** ${this.reSpiderInfo.index} *** 次抓取，有 ${mIds.length} 章需要重新抓取 ###`);

    // 尝试抓取15次，15次还没抓完就不抓了吧
    if (this.reSpiderInfo.index > 10) {
      this.logger.end(`### [end] 已经抓取 *** 10 *** 次了，还没有抓取完，休息一下，还有 ${mIds.length} 章需要重新抓取  ### \n\n\n`);
      // 每一个 return 都需要重置一下 this.reSpiderInfo
      this.reSpiderInfo = null;
      return ''
    }

    if (!mIds.length) {
      this.logger.end(`### [end] 没有目录需要重新抓取 ### \n\n\n`);
      // 每一个 return 都需要重置一下 this.reSpiderInfo
      this.reSpiderInfo = null;
      return '没有目录需要重新抓取'
    }
    const book = await this.sqlnovelsService.findById(id, true)
    if (!book) {
      this.logger.end(`### [end] 数据库里查不到此书 ### \n\n\n`);
      // 每一个 return 都需要重置一下 this.reSpiderInfo
      this.reSpiderInfo = null;
      return '数据库里查不到此书'
    }
    const from = book.from[book.from.length - 1]
    const filePath = this.logger.log(`# 书名: ${book.title}；作者: ${book.author}；id: ${id}；来源: ${from}； #`, {
      bookname: `$[book.title}][章节内容抓取失败修复`
    });
    const ids = mIds.map(({ menuId }: { menuId: number }) => menuId)
    const menuInfos = await this.sqlmenusService.getMenusByIds(ids)
    // @TODO: 看是否有把  getMenus 换成用 menus 表里本身的 from 参数
    const res = await this.getMenus(from, 999999, JSON.stringify(menuInfos));
    const [_m, menusWithFrom] = res && Array.isArray(res) && res.length > 1 ? res : [[], {}]
    if (!Object.keys(menusWithFrom).length) {
      this.logger.end(`### 没有抓取到目录信息或者获取不到 menus 表里的数据 ### \n\n\n`);
      // 每一个 return 都需要重置一下 this.reSpiderInfo
      this.reSpiderInfo = null;
      return '没有抓取到目录信息或者获取不到 menus 表里的数据'
    }
    this.logger.log(` ### 修复开始, 总共要修复 *** ${mIds.length} 章 ***，ids为：${ids} ###`, filePath);
    const successIds = []
    while (mIds.length) {
      const currentMid = mIds.shift()
      const { menuId, menuIndex } = currentMid
      const filterMenus = menuInfos.filter(({ id }) => id === menuId)
      const menuInfo = filterMenus.length ? filterMenus[0] : null
      if (menuIndex > 0) {
        if (menuInfo && menuId in menusWithFrom) {
          const { url, title, index } = menusWithFrom[menuId];
          const _index = Array.isArray(index) ? index[0] : index
          const success = await this.insertPages(id, menuId, _index, title, from, url, null, [])
          if (success) {
            successIds.push(menuId)
            // 删除 sqlerrors 表里数据
            await this.sqlerrorsService.remove(currentMid.id)
          }
        }
      } else {
        // 不属于书具体章节内容的先做删掉处理吧
        await this.sqlmenusService.remove(menuId)
      }
    }
    const successText = `书名: ${book.title}；id: ${id}。成功修复了 *** ${successIds.length} 章 ***（共 ${ids.length} 章）, 他们的ids为：${successIds.join(', ')}`
    this.logger.end(`### ${ids.length <= successIds.length ? '需要修复的章节全部' : '部分'}修复完成，${successText} ### \n\n\n`);

    // 还有没抓取完的继续抓取一下
    if (ids.length > successIds.length) {
      this.reGetPages(id)
    } else {
      this.reSpiderInfo = null
    }

    return successText
  }

  // 获取书的前20条page列表
  @Get('getFailedMenuIds')
  async getFailedMenuIds(@Query('id') id: number) {
    const mIds = await this.sqlerrorsService.getSqlerrorsByNovelId(id);
    return mIds.map(({ menuId }: { menuId: number }) => menuId)
  }

  // 获取抓取到的index是重复的目录对应的书ID列表
  @Get('getRepeatedMenuBooks')
  async getRepeatedMenuBooks() {
    const list = await this.sqlerrorsService.getRepeatedMenuBooks();
    const ids = list.map(({ id }) => id)
    const books = await this.sqlnovelsService.getBookByIds(ids)
    books.length && list.forEach((item) => {
      const fBook = books.filter((b) => b.id === item.id)
      if (fBook.length) {
        Object.assign(item, fBook[0])
      }
    })
    return list
  }

  // 获取抓取到的index是重复的目录列表
  @Get('getRepeatedMenuIds')
  async getRepeatedMenuIds(@Query('id') id: number) {
    const list = await this.sqlerrorsService.getRepeatedMenuIdsByNovelId(id);
    const mIds = list.map(({ menuId }) => menuId)
    const menus = await this.sqlmenusService.getMenusByIds(mIds)
    menus.length && list.forEach((item) => {
      const fMenu = menus.filter((b) => b.id === item.menuId)
      if (fMenu.length) {
        delete fMenu[0].id
        Object.assign(item, fMenu[0])
      }
    })
    return list
  }

  @Post('view')
  async view(@Body('url') url: string) {
    return await this.getBookService.getBookInfo(url);
  }
}
