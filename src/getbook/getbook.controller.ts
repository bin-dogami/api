import { log, getValidTitle, getHostFromUrl, getNovelId, getMenuId, downloadImage } from '../utils/index'
import { Controller, Get, Post, Body, Param, HttpCode } from '@nestjs/common';
import { GetBookService } from './getbook.service';
import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { SqltypesService } from '../sqltypes/sqltypes.service';
import { SqlmenusService } from '../sqlmenus/sqlmenus.service';
import { SqlpagesService } from '../sqlpages/sqlpages.service';
import { SqltypesdetailService } from '../sqltypesdetail/sqltypesdetail.service';
import { Mylogger } from '../mylogger/mylogger.service';

@Controller('getbook')
export class GetBookController {
  private readonly logger = new Mylogger(GetBookController.name);

  constructor(
    private readonly getBookService: GetBookService,
    private readonly sqlnovelsService: SqlnovelsService,
    private readonly sqltypesService: SqltypesService,
    private readonly sqlmenusService: SqlmenusService,
    private readonly sqlpagesService: SqlpagesService,
    private readonly sqltypesdetailService: SqltypesdetailService,
  ) { }

  @Get()
  getHello(): string {
    return this.getBookService.getHello();
  }

  @Post('spider')
  async spider(@Body('url') url: string) {
    this.logger.start(`\n ### 【start】 开始抓取书信息 ###`);
    const bookInfo = await this.getBookService.getBookInfo(url);
    if (!bookInfo) {
      this.logger.log(`# [failed] 抓取书信息出错，失败原因看上一条 #`);
      return {
        '错误': '抓取书信息出错'
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
      // 查询目录
      const count = await this.sqlmenusService.findCountByNovelId(novel['id']);

      const { id, title, description, author, faildIndex } = novel;
      this.insertMenus({ ...novel, ...{ from: url }, ...{ filePath } });
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
    const newThumbPath = await downloadImage('images', thumb, currentNovelId)
    const newNovel = {
      id: currentNovelId,
      title,
      description,
      author,
      typeid: typeInfo.id,
      from: [from],
      tags: [],
      thumb: newThumbPath,
      faildIndex: [],
    }
    // 写入书信息
    this.logger.log(`# 开始写入书信息 #`);
    const _novel = await this.sqlnovelsService.create(newNovel);
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
    this.insertMenus({ ..._novel, ...{ from: url }, ...{ filePath } });
    this.logger.end(`### 【end】结束抓取/更新书信息 ### \n`);
    return _novel
  }

  async insertMenus(args: any) {
    let lastIndex = await this.sqlmenusService.findLastIndexByNovelId(args.id)
    const [menus, reFaildIndex] = await this.getMenus(args.from, lastIndex, args.faildIndex.join(','));
    // @TODO: test?
    args.menus = menus.slice(0, 20);
    await this.insertMenuAndPages(args, reFaildIndex);
  }

  @Post('getMenus')
  async getMenus(@Body('url') url: string, lastIndex?: number, faildIndex?: string) {
    return this.getBookService.getMenus(url, lastIndex, faildIndex);
  }

  // 一次性插入多个目录及对应的章节内容
  @Post('insertMenuAndPages')
  async insertMenuAndPages(@Body() args: any, reFaildIndex?: number[]) {
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
      failedIndex: reFaildIndex || [],
      lastPage: '获取或插入page失败'
    }
    let currentMenuId = await this.sqlmenusService.findLastIdByNovelId(id)
    while (menus.length) {
      const { url, title, index } = menus.shift();
      let menuInfo: any;
      // 插入或获取 index 这一条目录数据
      try {
        currentMenuId = getMenuId(currentMenuId, true)
        menuInfo = await this.sqlmenusService.create({
          id: currentMenuId,
          novelId: id,
          mname: getValidTitle(title),
          moriginalname: title,
          index,
          from,
        });
        this.logger.log(`# 插入目录成功 # 目录名：【${menuInfo.moriginalname}】 是第${index}章；id: ${menuInfo.id}`)
      } catch (err) {
        menuInfo = await this.sqlmenusService.findMenuByNovelIdAndIndex(id, index);
        if (menuInfo && menuInfo.id) {
          this.logger.log(`# 此目录已经被写入过数据库了 # 目录名：【${menuInfo.moriginalname}】, 第${index}章；id: ${menuInfo.id}`)
        } else {
          this.logger.log(`# [failed] 此目录插入失败也找不到此目录数据 # 目录名：【${menuInfo.moriginalname}】, 第${index}章, 来源: ${from} \n`)
          index > 0 && res.failedIndex.push(index)
        }
      }
      if (!menuInfo || !menuInfo.id) {
        continue;
      }

      // 插入page
      try {
        this.logger.log(`# 第${index}章开始抓取数据 # 来源：${host + url}`);
        const list = await this.getBookService.getPageInfo(host + url);
        this.logger.log(`# 第${index}章开始插入page #`);
        let content = list.length ? list.map((text) => text.trim().length ? `<p>${text}</p>` : '').filter((text) => !!text).join('') : '';
        // // @TODO: test
        // if (index === 91) {
        //   content = '';
        // }
        if (!menus.length) {
          res.lastPage = `第${index}章: 【${menuInfo.moriginalname}】 <br />${content}`;
        }
        if (!content.trim().length) {
          this.logger.log(`# [failed] 插入章节内容失败，没抓到内容 # 目录名：【${menuInfo.moriginalname}】, 是第${index}章, 错误信息：一个字也没抓到 \n`)
          index > 0 && res.failedIndex.push(index)
          continue;
        }
        const pageInfo = await this.sqlpagesService.create({
          id: menuInfo.id,
          novelId: id,
          mname: getValidTitle(title),
          content: content,
          wordsnum: content.length,
          from: host + url,
        });
        this.logger.log(`# 插入章节内容成功 # 目录名：【${pageInfo.mname}】, 是第${index}章, 字数：${content.length}；id: ${menuInfo.id} \n`)
        res.successLen++
      } catch (err) {
        this.logger.log(`# [failed] 插入章节内容错误 # 目录名：【${menuInfo.moriginalname}】, 是第${index}章, 错误信息：${err}} \n`)
        index > 0 && res.failedIndex.push(index)
      }
    }
    const menusLen = await this.sqlmenusService.findCountByNovelId(id);
    await this.sqlnovelsService.updateFields(id, {
      menusLen,
      faildIndex: res.failedIndex
    });
    this.logger.log(' ############################################### ');
    this.logger.end(`### 【end】完成目录及page插入，本插入成功 ${res.successLen} 条，失败章节 ${res.failedIndex.length} 条（index.）：${res.failedIndex.length ? res.failedIndex.join(', ') : '无'}。 ### \n\n\n`);
    return res
  }

  @Post('view')
  async view(@Body('url') url: string) {
    return this.getBookService.getBookInfo(url);
  }

  // @Post('menu')
  // getMenu(@Body('url') url: string) {
  //   return 'menu';
  // }

  // @Post('page')
  // getPage(@Body('url') url: string) {
  //   return this.getBookService.getPage(url);
  // }
}
