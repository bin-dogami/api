import { getValidUrl, getHostFromUrl, getHost, getNovelId, getMenuId, downloadImage, ImagePath } from '../utils/index'
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
import { ISpiderStatus, SqlspiderService, CreateSqlspider } from '../sqlspider/sqlspider.service';
import { Mylogger } from '../mylogger/mylogger.service';
import { CommonService } from '../common/common.service';
import { SitemapService } from '../sitemap/sitemap.service';
import { Cron, Interval } from '@nestjs/schedule';

const dayjs = require('dayjs')

@Controller('getbook')
export class GetBookController {
  private readonly logger = new Mylogger(GetBookController.name);
  justSpiderOne = false;
  // 重新抓取的次数限制
  reSpiderInfo = null;
  tumorUseFixList = null;
  // 1 是后台点的 抓取全部，2 是定时任务在抓取全部，3 是单个的抓取，0 是没有在抓取
  currentSpiderStatus = 0;

  constructor(
    private readonly commonService: CommonService,
    private readonly getBookService: GetBookService,
    private readonly sitemapService: SitemapService,
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
  ) {
  }

  async setRecommend(novel) {
    const { id, title, description, author, authorId, thumb, isOnline } = novel
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
      isOnline
    });
    this.logger.log(`# 本书设置为推荐 end #`);
  }

  // @Post('spiderBooksNewMenus')
  // async spiderBooksNewMenus() {
  //   const allNovels = await this.sqlnovelsService.getAllBooks()
  //   // @TODO: 使用map 可能导致同步失效，必须找个合适的办法，建个表或者弄个全局的办法
  //   allNovels.map(async (novel: any) => {
  //     const { from } = novel
  //     await this.spider(from, '', 0)
  //   })
  // }

  // 删除大于等于目录id的数据
  @Post('deleteMenusGtId')
  async deleteMenusGtId(@Body('id') id: string, @Body('novelId') novelId: string) {
    await this.sqlpagesService.batchDeleteGtPages(+id, +novelId, true)
    await this.sqlmenusService.batchDeleteGtMenus(+id, +novelId, true)
  }

  // mnum 为暂时只抓取几章，先记入数据库，再慢慢抓取
  @Post('spider')
  async spider(@Body('url') url: string, @Body('recommend') recommend: string, @Body('mnum') mnum: number) {
    if (this.currentSpiderStatus) {
      return {
        '错误': `有书在抓取中`
      }
    }
    this.justSpiderOne = true
    const isSpidering = await this.detectWhoIsSpidering()
    if (isSpidering) {
      return { '抓取失败': isSpidering }
    }
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
    let novel = await this.sqlnovelsService.findByOriginalTitle(title, author);
    if (novel) {
      if (recommend) {
        await this.setRecommend(novel)
      }
      if (novel.isSpiderComplete) {
        // @TODO: 再跑一两遍数据，这个最好注释了吧，不需要再这删掉 spider 数据(上次因为误掉了所有目录数据所以全本的也要再跑一遍数据)
        await this.sqlspiderService.remove(novel.id)
        this.logger.end(`### 【end】本书已经全部抓完了 ### id: ${novel.id}； \n\n `);
        return { '已经是全本了': '都抓完了还抓啥啊' }
      }

      const spider = await this.sqlspiderService.getById(novel.id)
      if (spider) {
        if (spider.status !== ISpiderStatus.SPIDERING) {
          spider.status = ISpiderStatus.SPIDERING
          await this.sqlspiderService.update(spider)
        }
      } else {
        await this.sqlspiderService.create(novel.id, ISpiderStatus.SPIDERING, false)
      }

      // 查询目录
      const count = await this.sqlmenusService.findCountByNovelId(novel['id']);

      const { id, title, description, author } = novel;
      this.currentSpiderStatus = 3
      this.insertMenus({ ...novel, ...{ from: url }, ...{ filePath }, ...{ mnum: _mnum }, ...{ isAllIndexEq0: spider && spider.allIndexEq0 === true } });
      this.logger.end(`### 【end】本书不是第一次抓取 ### id: ${id}； \n\n `);
      return { '本书不是第一次抓取': '', '已抓取章数': count, id, title, description, author };
    }

    // 查询分类
    this.logger.log(`# 开始查询书所属分类 #`);
    let typeInfo = await this.sqltypesService.findOneByName(type.includes('其他') ? '其他小说' : type);
    const isTypeCreateNow = !typeInfo;
    if (!typeInfo) {
      this.logger.log(`# 开始创建新分类 #`);
      typeInfo = await this.sqltypesService.create({
        name: type,
        isTag: false
      });
    }

    const _novel = await this.getBookService.createNovel(true, title, author, thumb, description, typeInfo.id, typeInfo.name, from)
    if (typeof _novel === 'string') {
      return {
        '错误': _novel
      };
    } else {
      const isAllEq0 = await this.detectNovelMenusIndexIsAllEq0(_novel.id)
      await this.sqlspiderService.create(_novel.id, ISpiderStatus.SPIDERING, isAllEq0)
      recommend && await this.setRecommend(_novel)
    }

    // 写入分类详情表
    if (isTypeCreateNow) {
      this.logger.log(`# 开始写入分类详情表 #`);
      await this.sqltypesdetailService.create({
        tid: typeInfo.id,
        isTag: false,
        typename: typeInfo.name,
        novelId: _novel.id
      });
    }
    this.currentSpiderStatus = 3
    this.insertMenus({ ..._novel, ...{ from: url }, ...{ filePath }, ...{ mnum: _mnum } });
    this.logger.end(`### 【end】结束抓取/更新书信息 ### \n`);
    return _novel
  }

  async detectNovelMenusIndexIsAllEq0(id: number): Promise<boolean> {
    const [menus, count] = await this.sqlmenusService.getMenusByBookId(id, 1, 5, false)
    if (count <= 0) {
      return false
    }

    let isAllEq0 = true
    menus.forEach(({ index }) => {
      if (index > 0) {
        isAllEq0 = false
      }
    })
    return isAllEq0
  }

  // 更改抓取中的书状态为已抓取完
  @Post('setCurrentSpideringStop')
  async setCurrentSpideringStop() {
    this.currentSpiderStatus = 0
    return await this.sqlspiderService.stopAllSpidering()
  }

  // 抓取第一本/下一本书
  async spiderNext(id: number) {
    // 从主页进行的只抓取本书的
    if (this.justSpiderOne) {
      this.currentSpiderStatus = 0
      return
    }

    const SpideringNovels = await this.sqlspiderService.findAllByStatus(ISpiderStatus.SPIDERING)
    if (SpideringNovels.length) {
      const text = `有${SpideringNovels.length}本书正在抓取中：${SpideringNovels.slice(0, 10).map(({ id }) => id).join(', ')}`
      this.logger.end(`### 【end】${text} ### \n`);
      return text
    }

    const nextSpiderNovelId = await this.sqlspiderService.getNextUnspider(id)
    const novel = await this.sqlnovelsService.findById(nextSpiderNovelId, true)
    if (!novel || !Array.isArray(novel.from) || !novel.from.length) {
      // 书已经被删掉了，而有 nextSpiderNovelId，说明这条 spider 数据有问题，需要删除并抓取下一个
      if (nextSpiderNovelId > 0) {
        this.logger.log(`### 找不到要抓取的书，id: ${nextSpiderNovelId}，这条数据spider数据有问题，准备删除 ### \n`);
        await this.sqlspiderService.remove(nextSpiderNovelId)
        this.logger.log(`### 开始抓取下一本书 ### \n`);
        await this.spiderNext(nextSpiderNovelId)
        return `找不到要抓取的书，id: ${nextSpiderNovelId}`
      }
      this.logger.end(`### 【end】找不到要抓取的书，抓取结束了，id: ${nextSpiderNovelId} ### \n`);

      // 定时任务抓取完了自动提交收录
      if (this.currentSpiderStatus === 2) {
        await this.getUnOnlineMenusAndSubmitSEO()
      }
      this.currentSpiderStatus = 0
      return `找不到要抓取的书，抓取结束了，id: ${nextSpiderNovelId}`
    }

    // 更新抓取状态为抓取中
    const spider = await this.sqlspiderService.getById(novel.id)
    if (spider) {
      spider.status = ISpiderStatus.SPIDERING
      await this.sqlspiderService.update(spider)
    } else {
      const isAllEq0 = await this.detectNovelMenusIndexIsAllEq0(id)
      await this.sqlspiderService.create(id, ISpiderStatus.SPIDERING, isAllEq0)
    }

    // 抓书开始
    this.logger.start(`\n\n\n\n ### 【start】 开始抓取书信息 ###`);
    const { title, author } = novel;
    if (!novel.from.length) {
      this.logger.end(`### 【end】这本书没有来源，无法抓取，可能是手动添加的书，id: ${nextSpiderNovelId} ### \n`);
      await this.spiderNext(nextSpiderNovelId)
      return `这本书没有来源，无法抓取，可能是手动添加的书，id: ${nextSpiderNovelId}`
    }
    const from = novel.from[novel.from.length - 1]
    const filePath = this.logger.log(`# 获取书信息成功 # 书名: ${title}；作者: ${author}；来源: ${from}； id: ${novel.id}`, {
      bookname: title
    });

    this.insertMenus({ ...novel, ...{ from }, ...{ filePath }, ...{ mnum: 0 } });
    return `开始抓取${id ? '下' : '第'}一本书：${title}，作者: ${author}，来源: ${from}，id: ${nextSpiderNovelId}`
  }

  // 检查有哪本书在抓取中
  @Get('detectWhoIsSpidering')
  async detectWhoIsSpidering() {
    const SpideringNovels = await this.sqlspiderService.findAllByStatus(ISpiderStatus.SPIDERING)
    const unSpiderCount = await this.sqlspiderService.getUnSpiderTotal()
    if (SpideringNovels.length) {
      return `有${SpideringNovels.length}本书正在抓取中：(#${SpideringNovels[0].id}#)，${unSpiderCount}本书待抓取，spider状态为 ${this.currentSpiderStatus}`
    } else if (this.currentSpiderStatus) {
      return `spider状态为 ${this.currentSpiderStatus}`
    } else {
      return ''
    }
  }

  async getUnOnlineMenusAndSubmitSEO() {
    if (process.env.NODE_ENV === 'development') {
      return
    }
    // 获取所有上线了的书的未上线目录
    const menus = await this.commonService.getMenusByDateInOnlineNovles('', '', '2')
    this.logger.log(`\n ### 抓完了，现在获取刚抓取的目录，共${menus.length}章，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`);
    if (menus.length) {
      // 目录上线
      try {
        await this.sqlmenusService.batchSetMenusOnline(menus.map(({ id }) => id))
        this.logger.log(`\n ### 目录上线成功，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`);

        // 提交到百度收录
        const links = menus.map(({ id }) => `https://m.zjjdxr.com/page/${id}`).join('\n').trim()
        const res = await this.commonService.curlBaiduSeo(links)
        this.logger.log(`\n ### 提交抓取的目录到百度收录：${res.msg}，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`);

        // 更新 sitemap.xml
        const siteMapRes = await this.sitemapService.createSiteMap()
        this.logger.log(`\n ### sitemap.xml文件${siteMapRes} ###`);
      } catch (error) {
        this.logger.log(`\n ### 目录上线失败，原因：${error} ###`);
      }
    }
    this.logger.end(`\n ### 【end】，本次抓取结束，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`);
  }

  // @NOTE: 定时任务，每天 1点到晚上11点多个时间点执行
  @Cron('30 16 2,6,8,10,12,15,18,21,23 * * *')
  async cronSpiderAll() {
    this.logger.start(`\n ### 【start】 到点自动开始抓取所有新目录了，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`, this.logger.createAutoSpiderAll());
    if (this.currentSpiderStatus) {
      this.logger.end(`\n ### 【end】有抓取任务在进行中，本次自动抓取任务取消 ###`);
      return
    }
    this.currentSpiderStatus = 2
    await this.spiderAll(true)
  }

  // 统一抓取所有需要再次抓取的书
  @Post('spiderAll')
  async spiderAll(isAutoSpider: boolean) {
    if ((isAutoSpider && this.currentSpiderStatus === 1) || (!isAutoSpider && this.currentSpiderStatus === 2)) {
      const text = this.currentSpiderStatus === 2 ? '定时任务在抓呢' : '后台点的抓取按钮还没抓完呢'
      this.logger.end(`\n ### 【end】，${text} ###`);
      return text
    }
    if (!isAutoSpider) {
      this.currentSpiderStatus = 1
    }
    this.justSpiderOne = false
    const SpideringNovels = await this.sqlspiderService.findAllByStatus(ISpiderStatus.SPIDERING)
    if (SpideringNovels.length) {
      return `有${SpideringNovels.length}本书正在抓取中：(#${SpideringNovels[0].id}#)${SpideringNovels.map(({ id }) => id).join(', ')}`
    }
    const nextSpiderNovelId = await this.sqlspiderService.getNextUnspider(0)
    // 有待抓取的先把待抓取的抓完，没有了再一个一个抓取
    if (nextSpiderNovelId) {
      return await this.spiderNext(0)
    }
    // 先把已抓取完的统一改为待抓取状态再一个一个抓取
    try {
      await this.sqlspiderService.setSpideredToUnSpider()
    } catch (error) {
      //
    }
    return await this.spiderNext(0)
  }

  resetSpiderStatus() {
    this.currentSpiderStatus = 0
  }

  // 抓取并插入目录
  async insertMenus(args: any) {
    // 倒序获取最后3章
    let lastMenus: any = await this.sqlmenusService.findLastMenusByNovelId(args.id, 3)
    // 最后一个有 index 的目录
    let lastMenu = null
    let noNeedInsertMenus = []
    let menus: any = null
    if (lastMenus.length) {
      // 之前才抓取了不到 3章的全删掉吧，重新抓取
      if (lastMenus.length < 3) {
        this.logger.log(`### 上次抓取到的目录不足3章，先全删了再重新抓取 ###`)
        await this.deleteMenusGtId('0', args.id)
      } else {
        noNeedInsertMenus = lastMenus.map((item: any) => {
          if (lastMenu) {
            return null
          }
          if (item.index > 0) {
            lastMenu = item
            return null
          }
          return item
        }).filter((item) => !!item)
        // 如果最后一个有 index 的目录存在啥也不用管
        if (lastMenu) {
          //
        } else {
          // 如果三个目录 index 都为 0，那获取所有的目录，然后一个一个比对，看到哪一个了
          const _menus = await this.getMenus(args.from, 0)
          const menusLen = _menus.length
          let currentIndex = _menus.length - 1
          while (currentIndex > 1) {
            const { title } = _menus[currentIndex]
            if (title === lastMenus[0].moriginalname) {
              const prevMenu = _menus[currentIndex - 1]
              if (prevMenu && prevMenu.title === lastMenus[1].moriginalname) {
                const prevAndPrevMenu = _menus[currentIndex - 2]
                if (prevAndPrevMenu && prevAndPrevMenu.title === lastMenus[2].moriginalname) {
                  menus = _menus.slice(currentIndex + 1)
                  break;
                }
              }
            }
            currentIndex--
          }

          // 对比目录没有找到上次的三个目录，可能没有新的章节，也可能目录名称被改了，也可能目录分页了（确认抓取的网站是不是分页了）
          if (!menus || !menus.length) {
            let text = `上次抓取的最后三章的index 都为0，对比整个目录list，没有定位到次抓取位置，${menusLen % 10 === 0 ? '所有目录数刚好个' + menusLen + '个，是不是目录分页了' : '应该新的章节还没有，或者上次的目录名称已经被改了'}`
            // const text = `(${args.isAllIndexEq0 ? '此书所有index都是0' : '此书index并不都是0'}) 上次抓取的最后三章的index 都为0，没法定位到上次抓取位置。如果这是个巧合，删掉最后几章再抓取；如果不是巧合，可以考虑删除书再重新抓（要不就写匹配的抓取组件吧）`
            // this.logger.end(`### ${text} ###`);
            const titles = lastMenus.map(({ moriginalname }) => moriginalname).join(',')
            // 完本的应该改一下书的状态
            if (titles.includes('结局') || titles.includes('完本')) {
              const lastMenu = lastMenus[0]
              await this.sqlerrorsService.create({
                menuId: lastMenu.id,
                novelId: args.id,
                menuIndex: lastMenu.index,
                type: IErrors.LAST3_MENUS_INDEX_EQ0,
                info: `完本了？`,
              })
            }
            // if (this.justSpiderOne) {
            //   this.resetSpiderStatus()
            //   await this.sqlspiderService.setFailedSpider(args.id, `上次抓取的最后三章的index 都为0，没法定位到上次抓取位置 (${args.isAllIndexEq0 ? '此书所有index都是0' : '此书index并不都是0'})`)
            //   return {
            //     '错误': `${text}`
            //   }
            // }
            this.logger.end(`### ${text} ###`);
            return await this.setSpiderComplete(args.id)
          }
        }
      }
    }

    const text = lastMenu ? `上一次抓取的最后的目录id为${lastMenus[0].id}；index为${lastMenus[0].index}；moriginalname为${lastMenus[0].moriginalname}；` : '本书从第一章开始抓取'
    this.logger.log(`### ${text} ###`);
    menus = menus || await this.getMenus(args.from, args.mnum, lastMenu);
    // console.log(menus)
    if (!Array.isArray(menus)) {
      const err = menus ? menus.err : ''
      this.logger.end(`###[failed] 获取目录失败 ${err} ###`)
      lastMenu && await this.cannotFindLastMenu(lastMenu.id, args.id, lastMenu.index, args.from, lastMenu.moriginalname)
      if (this.justSpiderOne) {
        this.resetSpiderStatus()
        return {
          '错误': `获取目录失败 ${err}`
        }
      }
      return await this.setSpiderComplete(args.id, this.justSpiderOne)
    }

    // args.menus = args.mnum > 0 ? menus.slice(0, args.mnum) : menus;
    args.menus = menus
    const host = getHost(args.from)
    const aHost = host.split('.')
    // 把抓取的 域名 加入内容过滤名单
    await this.sqltumorService.create({
      type: aHost.length > 2 ? ITumor.ARRAY_REPLACE : ITumor.JUST_REPLACE,
      text: aHost.length > 2 ? `${aHost[0]}, ${aHost[aHost.length - 1]} ` : host,
      host: host,
      useFix: false,
    })
    const spider = await this.sqlspiderService.getById(args.id)
    if (spider) {
      spider.text = `${menus.length}章待抓取`
      await this.sqlspiderService.update(spider)
    }
    await this.insertMenuAndPages(args, noNeedInsertMenus.reverse());
  }

  async cannotFindLastMenu(menuId, novelId, index, from, moriginalname) {
    await this.sqlerrorsService.create({
      menuId,
      novelId,
      menuIndex: index,
      type: IErrors.CANNOT_FIND_LAST_MENU,
      info: `上一次抓取的最后的目录找不到了，最后目录名：${moriginalname}，index: ${index}, 目录list: ${from}`,
    })
  }

  // 一次性插入多个目录及对应的章节内容
  async insertMenuAndPages(args: any, noNeedInsertMenus: any[]) {
    const { id, title, menus, from, filePath, mnum } = args;
    const host = getHostFromUrl(from);
    this.logger.start(` ### 【start】开始插入目录及page ###`, filePath);
    this.logger.log(`书名: ${title} `);
    this.logger.log(`本书id: ${id} `);
    this.logger.log(`共 ${menus.length} 章`);
    this.logger.log(`目录来源 ${from} （${host} ）`);
    this.logger.log('###############################################\n');
    const res = {
      successLen: 0,
      failedIndex: [],
      lastPage: '获取或插入page失败'
    }
    let currentMenuId = await this.sqlmenusService.findLastMenuId()
    let menusInsertFailedInfo = ''
    while (menus.length) {
      const currentMenuInfo = menus.shift();
      // moriginalname === title
      const { url, index, title, mname, moriginalname } = currentMenuInfo
      // 上次抓取的最后一（或二）章index 都=0的不再抓取
      if (noNeedInsertMenus.length) {
        const _menu = noNeedInsertMenus.shift()
        if (_menu.moriginalname === moriginalname) {
          continue;
        }
      }
      // 每抓取5次内容检查一下是否在抓取状态，如果被取消了抓取就中止
      if (!this.currentSpiderStatus) {
        const text = `因抓取状态不是抓取中，中止抓取，index: ${index} ，title: ${title} `
        this.logger.log(`# ${text} #`)
        await this.sqlspiderService.completeSpider(id, text)
        break
      }

      let ErrorType = 0
      let menuInfo: any;
      const host = getHostFromUrl(from);
      const _url = getValidUrl(host, url, from)
      // 插入或获取 index 这一条目录数据
      try {
        currentMenuId = getMenuId(currentMenuId, true)
        menuInfo = await this.sqlmenusService.create({
          id: currentMenuId,
          novelId: id,
          mname,
          moriginalname: title,
          index,
          // @TODO: 建一个后台页面专门手动查看处理问题吧
          ErrorType,
          from: _url,
          // 新创建的目录先不上，等确定没问题了再上（顺便也提交百度收录）
          isOnline: false
        });
        this.logger.log(`# 插入目录成功 # 目录名：【${moriginalname} 】 是第${index} 章；id: ${menuInfo.id} `)
      } catch (err) {
        this.logger.log(`#[failed] 章节插入错误，中止抓取 # 目录名：【${moriginalname} 】, 第${index} 章, 目录list来源: ${from} \n`)
        index > 0 && res.failedIndex.push(index)
        menusInsertFailedInfo = '[章节插入错误！！！！！！！ 看上一条错误信息]'
        await this.sqlerrorsService.create({
          menuId: 0,
          novelId: id,
          menuIndex: index,
          type: IErrors.MENU_INSERT_FAILED,
          info: `第${index} 章(${menuInfo.moriginalname}) 插入目录失败, 目录list来源: ${from} `,
        })
      }
      if (!menuInfo || !menuInfo.id) {
        this.logger.log(`# [failed] 目录插入失败导致page内容无法插入:  # 目录名：【${moriginalname}】, 是第${index}章 \n`)
        if (res) {
          index > 0 && res.failedIndex.push(index)
          await this.insertPageFailed(currentMenuId, id, index, _url, moriginalname, `目录插入失败导致page内容无法插入 `)
        }
        continue;
      }

      await this.insertPages(id, currentMenuId, index, mname, moriginalname, from, url, res, menus)
    }
    // novel 表更新
    if (res.successLen) {
      const menusLen = await this.sqlmenusService.findCountByNovelId(id);
      // @TODO: 卷更新
      await this.sqlnovelsService.updateFields(id, {
        menusLen,
        updatetime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      })
    }
    this.logger.log(' ############################################### ');
    const failedInfo = menusInsertFailedInfo ? menusInsertFailedInfo : `失败章节 ${res.failedIndex.length} 条（index.）：${res.failedIndex.length ? res.failedIndex.join(', ') : '无'} `
    this.logger.end(`### 【end】完成目录及page插入，插入成功 ${res.successLen} 条，${failedInfo} 。 ### \n\n\n`);

    // 抓取章节
    this.reGetPages(id, 0, mnum === 5)
    return res
  }

  // insertPages 参数更改要慎重，有两个地方在用
  async insertPages(id, mId, index, mname, moriginalname, from, url, res, menus) {
    const host = getHostFromUrl(from);
    const _url = getValidUrl(host, url, from)
    // 插入page
    try {
      this.logger.log(`# 第${index} 章开始抓取数据 # 来源：${_url} `);
      const inserted = await this.getBookService.insertPage(_url, id, mId, {
        moriginalname,
        // mname,
        index,
        // from,
        // url,
        res,
        menus
      })
      if (typeof inserted === 'string') {
        if (res) {
          index > 0 && res.failedIndex.push(index)
          await this.insertPageFailed(mId, id, index, from, moriginalname, '获取章节内容失败, ' + inserted)
        }
        return false
      }
      // const list = await this.getBookService.getPageInfo(_url);
      // if (!list || !Array.isArray(list) || 'err' in list) {
      //   const err = list && list.err ? `(${list.err})` : ''
      //   this.logger.log(`###[failed] 获取章节内容失败 ${err}, 目录名：【${moriginalname} 】, 是第${index} 章 ###`);
      //   if (res) {
      //     index > 0 && res.failedIndex.push(index)
      //     await this.insertPageFailed(mId, id, index, _url, moriginalname, '获取章节内容失败: ' + err)
      //   }

      //   return false
      // }

      // const tumorList = await this.sqltumorService.findList(false, getHost(_url));
      // const contentList: string[] = await this.dealContent(list, tumorList)
      // if (res && !menus.length) {
      //   res.lastPage = `第${index} 章: 【${moriginalname} 】 <br />${contentList[0]}`;
      // }
      // if (!contentList[0].trim().length) {
      //   this.logger.log(`# [failed] 插入章节内容失败，抓到的内容为空或错误 # 目录名：【${moriginalname}】, 是第${index}章, 错误信息：一个字也没抓到 \n`)
      //   if (res) {
      //     index > 0 && res.failedIndex.push(index)
      //     await this.insertPageFailed(mId, id, index, _url, moriginalname, '插入章节内容失败，抓到的内容为空或错误')
      //   }
      //   return false
      // }
      // let i = 0
      // let nextId = mId

      // // @TODO: 先用修复的清理内容的文本简单地再次替换一下，之后再优化吧
      // if (this.tumorUseFixList === null) {
      //   this.tumorUseFixList = await this.sqltumorService.findList(true);
      // }

      // while (contentList.length) {
      //   let content = contentList.shift()

      //   // @TODO: 先用修复的清理内容的文本简单地再次替换一下，之后再优化吧
      //   Array.isArray(this.tumorUseFixList) && this.tumorUseFixList.forEach(({ text }: { text: string }) => {
      //     content = content.replace(text, '')
      //   })

      //   i++
      //   const page = i > 1 ? `第${i}页` : ''
      //   this.logger.log(`# 第${index} 章${page}开始插入page，此章节共 ${content.length} 个字 #`);
      //   const pageId = i === 1 ? mId : nextId
      //   nextId = contentList.length ? await this.getBookService.getNextPageId(pageId) : 0
      //   await this.sqlpagesService.create({
      //     id: pageId,
      //     nextId,
      //     novelId: id,
      //     content: content,
      //     wordsnum: content.length,
      //   });
      //   const mIdText = i === 1 ? '' : `目录id: ${mId}`
      //   this.logger.log(`# 插入章节内容成功 # 目录名：【${moriginalname}】, 是第${index}章${page}, 字数：${content.length}；id: ${pageId}；${mIdText} \n`)
      // }
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

  async getMenus(url: string, len?: number, lastMenu?: any) {
    return await this.getBookService.getMenus(url, len, lastMenu);
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

  async setSpiderComplete(id: number, noReset?: boolean, justSpider5Page?: boolean) {
    if (!noReset) {
      this.reSpiderInfo = null
    }
    // 通过主页设置的只抓取5个的方式抓取的，设置spider状态回0，以便之后再集体重新抓取
    if (this.currentSpiderStatus === 3) {
      this.currentSpiderStatus = 0
    }
    if (justSpider5Page) {
      const isAllEq0 = await this.detectNovelMenusIndexIsAllEq0(id)
      const spider = await this.sqlspiderService.getById(id)
      spider.status = ISpiderStatus.UNSPIDER
      spider.allIndexEq0 = isAllEq0
      await this.sqlspiderService.update(spider)
      // 如果只抓了5个目录且 index 都是 0 那就把前5个目录都删掉，不然下一次抓取还得去对比 index，麻烦，还不如先都删掉了
      if (isAllEq0) {
        // const count = await this.sqlmenusService.findCountByNovelId(id)
        // if (count === 5) {
        //   await this.sqlmenusService.removeByNovelId(id)
        //   await this.sqlpagesService.removeByNovelId(id)
        const menusLen = await this.sqlmenusService.findCountByNovelId(id);
        //   // 更新目录数
        await this.sqlnovelsService.updateFields(id, {
          menusLen,
          updatetime: dayjs().format('YYYY-MM-DD HH:mm:ss')
        })
        // }
      }
    } else {
      // 设置抓取完成并进行下一个的抓取
      await this.sqlspiderService.completeSpider(id)
    }
    await this.spiderNext(id)
  }

  // 重新抓取书的失败page
  // 在后台 failedPages 页面重新抓取的 isSingleReget 为 '1'
  // 从 spider 过来的只抓取了5章的（这种情况是先把书添加进来之后再集中抓取）抓完了设置抓取状态为 0，以便下次不用更改状态就能接着抓取
  @Get('reGetPages')
  async reGetPages(@Query('id') id: number, @Query('isSingleReget') isSingleReget?: number, justSpider5Page?: boolean) {
    if (!this.reSpiderInfo) {
      this.reSpiderInfo = {
        id,
        index: 0
      }
    }
    // 是否只重新抓取本书
    if (isSingleReget) {
      const SpideringNovels = await this.sqlspiderService.findAllByStatus(ISpiderStatus.SPIDERING)
      if (SpideringNovels.length) {
        return `有${SpideringNovels.length}本书正在抓取中：${SpideringNovels.slice(0, 10).map(({ id }) => id).join(', ')}`
      }
    } else {
      if (!(await this.sqlspiderService.isSpidering(id))) {
        return '因抓取状态不是抓取中，取消重新抓取'
      }
    }
    // const mIds = await this.sqlerrorsService.getAllPageLostByNovelId(id);
    const mIds = []
    this.reSpiderInfo.index++
    this.logger.start(`\n ### 【start】 开始抓取上次未抓取成功的章节内容，这是第 *** ${this.reSpiderInfo.index} *** 次抓取，有 ${mIds.length} 章需要重新抓取 ###`);

    // 尝试抓取15次，15次还没抓完就不抓了吧
    if (this.reSpiderInfo.index > 10) {
      this.logger.end(`### [end] 已经抓取 *** 10 *** 次了，还没有抓取完，休息一下，还有 ${mIds.length} 章需要重新抓取  ### \n\n\n`);
      // 每一个 return 都需要重置一下 this.reSpiderInfo
      await this.setSpiderComplete(id, false, justSpider5Page)
      return ''
    }

    if (!mIds.length) {
      this.logger.end(`### [end] 没有目录需要重新抓取 ### \n\n\n`);
      // 每一个 return 都需要重置一下 this.reSpiderInfo
      await this.setSpiderComplete(id, false, justSpider5Page)
      return '没有目录需要重新抓取'
    }
    const book = await this.sqlnovelsService.findById(id, true)
    if (!book) {
      this.logger.end(`### [end] 数据库里查不到此书 ### \n\n\n`);
      // 每一个 return 都需要重置一下 this.reSpiderInfo
      await this.setSpiderComplete(id, false, justSpider5Page)
      return '数据库里查不到此书'
    }
    const from = book.from[book.from.length - 1]
    const filePath = this.logger.log(`# 书名: ${book.title}；作者: ${book.author}；id: ${id}；来源: ${from}； #`, {
      bookname: `[${book.title}]章节内容抓取失败修复`
    });
    const ids = mIds.map(({ menuId }: { menuId: number }) => menuId)
    const menuInfos = await this.sqlmenusService.getMenusByIds(ids)
    if (!menuInfos.length) {
      this.logger.end(`### 获取不到目录信息，可能目录刚被删除了 ### \n\n\n`);
      await this.setSpiderComplete(id, false, justSpider5Page)
      return '获取不到目录信息，可能目录刚被删除了'
    }
    this.logger.log(` ### 修复开始, 总共要修复 *** ${mIds.length} 章 ***，ids为：${ids} ###`, filePath);
    const successIds = []
    while (menuInfos.length) {
      // const currentMid = menuInfos.shift()
      // const { menuId, menuIndex } = currentMid
      // const filterMenus = menuInfos.filter(({ id }) => id === menuId)
      // const menuInfo = filterMenus.length ? filterMenus[0] : null
      const currentMenu = menuInfos.shift()
      const { index, mname, moriginalname } = currentMenu
      if (index > 0) {
        // if (menuInfo && menuId in menusWithFrom) {
        // const { url, title, index } = menusWithFrom[menuId];
        // const _index = Array.isArray(index) ? index[0] : index
        const success = await this.insertPages(id, currentMenu.id, index, mname, moriginalname, from, currentMenu.from, null, [])
        if (success) {
          successIds.push(currentMenu.id)
          // 删除 sqlerrors 表里数据
          const filterMIds = mIds.filter(({ id, menuId }) => menuId === currentMenu.id)
          filterMIds.length && await this.sqlerrorsService.remove(filterMIds[0].id)
        }
        // }
      } else {
        // 不属于书具体章节内容的先做删掉处理吧
        await this.sqlmenusService.remove(id)
      }
    }
    const successText = `书名: ${book.title}；id: ${id}。成功修复了 *** ${successIds.length} 章 ***（共 ${ids.length} 章）, 他们的ids为：${successIds.join(', ')}`
    this.logger.end(`### ${ids.length <= successIds.length ? '需要修复的章节全部' : '部分'}修复完成，${successText} ### \n\n\n`);

    // 还有没抓取完的继续抓取一下
    // 如果 menuInfos 有删除掉的，那 ids.length !== successIds.length
    if (menuInfos.length > successIds.length) {
      this.reGetPages(id)
    } else {
      !isSingleReget && await this.setSpiderComplete(id, false, justSpider5Page)
    }

    return successText
  }

  // 获取书的前20条page列表
  // @Get('getFailedMenuIds')
  // async getFailedMenuIds(@Query('id') id: number) {
  //   const mIds = await this.sqlerrorsService.getSqlerrorsByNovelId(id);
  //   return mIds.map(({ menuId }: { menuId: number }) => menuId)
  // }

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

  // 根据type类型获取error表中书id对应的目录列表
  @Get('getErrorMenuIds')
  async getErrorMenuIds(@Query('id') id: number, @Query('type') type: string) {
    const list = await this.sqlerrorsService.getMenuIdsByNovelId(id, type);
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
