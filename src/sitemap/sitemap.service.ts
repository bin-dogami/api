import { Injectable } from '@nestjs/common';
import { Mylogger } from '../mylogger/mylogger.service';
import { SqlnovelsService } from '../sqlnovels/sqlnovels.service';
import { SqltypesService } from '../sqltypes/sqltypes.service';
import { SqlmenusService } from '../sqlmenus/sqlmenus.service';
import { SqlrecommendsService } from '../sqlrecommends/sqlrecommends.service';
import { SqlauthorsService } from '../sqlauthors/sqlauthors.service';

const dayjs = require('dayjs')
const fs = require('fs')

const { SitemapStream, streamToPromise } = require('sitemap')
const { Readable } = require('stream')

const siteMapPath = '../web-scan/public'
const timeFormat = 'YYYY-MM-DD HH:mm:ss'

@Injectable()
export class SitemapService {
  private readonly logger = new Mylogger(SitemapService.name);

  constructor(
    private readonly sqltypesService: SqltypesService,
    private readonly sqlnovelsService: SqlnovelsService,
    private readonly sqlmenusService: SqlmenusService,
    private readonly sqlrecommendsService: SqlrecommendsService,
    private readonly sqlauthorsService: SqlauthorsService,
  ) { }

  async getNavUrls() {
    const typesUrls = await (await this.sqltypesService.findAll(false)).map((({ id }) => (
      { url: `/types/${id}`, changefreq: 'hourly', priority: 0.2 }
    )))
    return [
      { url: '/', changefreq: 'hourly', priority: 1 },
      { url: '/types', changefreq: 'hourly', priority: 0.9 },
      { url: '/hot', changefreq: 'hourly', priority: 0.8 },
      { url: '/complete', changefreq: 'daily', priority: 0.7 },
      { url: '/author', changefreq: 'hourly', priority: 0.2 },
      { url: '/search', changefreq: 'hourly', priority: 0.1 },
      { url: '/404', changefreq: 'hourly', priority: 0.1 },
      ...typesUrls
    ]
  }

  async getBooksUrls(): Promise<any[]> {
    const recommends = await this.sqlrecommendsService.getAll()
    const recommendIds = []
    const oRecommendIds = {}
    recommends.forEach(({ id }) => {
      recommendIds.push(id)
      oRecommendIds[id] = 1
    })
    // 确定书没被删除并且上线了
    const recommendNovels = await this.sqlnovelsService.getBookByIds(recommendIds, 0)
    const oRecommendNovels = {}
    recommendNovels.forEach((item) => {
      oRecommendNovels[item.id] = item
    })
    for (var id in oRecommendIds) {
      if (id in oRecommendNovels) {
        // 没上线的要去掉
        if (!oRecommendNovels[id].isOnline) {
          delete oRecommendIds[id]
        }
      } else {
        delete oRecommendIds[id]
        // 书被删掉把推荐表里的对应数据删掉，@NOTE: 这里纯修复一下数据
        await this.sqlrecommendsService.removeByBookId(+id)
      }
    }

    const recommendUrls = Object.keys(oRecommendIds).map((id) => {
      const { updatetime, isSpiderComplete } = oRecommendNovels[id]
      // 根据最新更新时间调整权重
      const udpatedDays = dayjs(updatetime).diff(dayjs(), 'day')
      const priority = udpatedDays < -5 ? (
        isSpiderComplete ? 0.4 : 0.2
      ) : 0.9
      return { url: `/book/${id}`, changefreq: priority > 0.5 ? 'daily' : 'weekly', priority, lastmod: updatetime }
    })
    this.logger.log(`### 推荐书本共 ${recommendUrls.length}个，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`)

    // 完本且抓完的
    const completeBooks = await this.sqlnovelsService.getCompleteOrNotBooks(true, 500)
    const completedUrls = completeBooks.map(({ id, updatetime }) => {
      if (id in oRecommendIds) {
        return null
      }
      oRecommendIds[id] = 1
      // 根据最新更新时间调整权重
      const udpatedDays = dayjs(updatetime).diff(dayjs(), 'day')
      const priority = udpatedDays < -3 ? (udpatedDays < -10 ? 0.1 : 0.5) : 0.7
      const changefreq = udpatedDays < -3 ? (udpatedDays < -10 ? 'monthly' : 'weekly') : 'daily'
      return { url: `/book/${id}`, changefreq, priority, lastmod: updatetime }
    }).filter((item) => !!item)
    this.logger.log(`### 全本书共 ${completedUrls.length}个，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`)

    // 没抓完的
    const unCompleteBooks = await this.sqlnovelsService.getCompleteOrNotBooks(false, 1000)
    const unCompletedUrls = unCompleteBooks.map(({ id, updatetime }) => {
      if (id in oRecommendIds) {
        return null
      }
      oRecommendIds[id] = 1
      // 根据最新更新时间调整权重
      const udpatedDays = dayjs(updatetime).diff(dayjs(), 'day')
      const priority = udpatedDays < -5 ? (udpatedDays < -20 ? 0.1 : 0.4) : 0.8
      const changefreq = udpatedDays < -5 ? (udpatedDays < -20 ? 'monthly' : 'weekly') : 'daily'
      return { url: `/book/${id}`, changefreq, priority, lastmod: updatetime }
    }).filter((item) => !!item)
    this.logger.log(`### 非全本书共 ${unCompletedUrls.length}个， 当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`)

    return [
      ...recommendUrls,
      ...completedUrls,
      ...unCompletedUrls,
    ]
  }

  // 想根据 书ids 去批量取书的最新 100 条数据，但是一次性取 25 本书的 最后 10 章都很慢了（快10秒了），效率太低了
  // 所以就打算取最近上线的 250 本书的最新 100 条数据（100 条和 10条没多大区别）和 除了 250 本书以外 && 250书上线前时间到现在的所有目录
  async getMenusUrls() {
    const [novels, count] = await this.sqlnovelsService.getBooksByParams({
      select: ["id", "ctime"],
      where: {
        isOnline: true,
      },
      order: {
        ctime: 'DESC'
      },
      take: 250
    })
    const novelIds = novels.map(({ id }) => id)
    // 250 本书中最早抓到的那本书的时间
    const lastCtime = novels[novels.length - 1].ctime
    // 非最近 250 本书的
    const newMenus = await this.sqlmenusService.getMenusByNotInNovelIds(novelIds, lastCtime)
    this.logger.log(`### 从 ${dayjs(lastCtime).format(timeFormat)} 开始抓取的已上线的 目录 共 ${newMenus.length}个，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`)
    // 250 本书的每本最后 150 章，共 37500 章，@NOTE: 要考虑 xml 文件最大 10M
    let booksMenus = []
    while (novelIds.length) {
      const id = novelIds.shift()
      const nMenus = await this.sqlmenusService.getLastTakeMenusByNovelId(id, 300)
      booksMenus = [...booksMenus, ...nMenus]
    }
    this.logger.log(`### 最近上线的 250 本书的最近100个目录 共有 ${booksMenus.length}个，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`)

    return [...newMenus, ...booksMenus].map(({ id, ctime }) => {
      const udpatedDays = dayjs(ctime).diff(dayjs(), 'day')
      const priority = udpatedDays < -30 ? 0.6 : 0.7
      const changefreq = udpatedDays < -30 ? 'weekly' : 'always'
      return { url: `/page/${id}`, changefreq, priority, lastmod: ctime }
    })
  }

  async getAuthors() {
    const authors = await this.sqlauthorsService.getAuthors(0, 1000, true)
    const _authors = []
    while (authors.length) {
      const { id, level, novelIds } = authors.shift()
      if (novelIds.length) {
        _authors.push({ id, level })
      } else {
        // @NOTE: 修复数据
        await this.sqlauthorsService.remove(id)
      }
    }

    return _authors.map(({ id, level }) => {
      const priority = level > 0 ? 0.4 : 0.3
      const changefreq = level > 0 ? 'daily' : 'weekly'
      return { url: `/author/${id}`, changefreq, priority }
    })
  }

  // @TODO: 记得改 robots.txt
  // https://github.com/ekalinin/sitemap.js
  async createSiteMap() {
    this.logger.start(`### 【start】开始更新/创建sitemap.xml文件，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`, this.logger.createSitemapLogFile())
    const navUrls = await this.getNavUrls()
    this.logger.log(`### 导航链接共 ${navUrls.length}个，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ### \n`)

    const bookUrls = await this.getBooksUrls()
    this.logger.log(`### 书本链接共 ${bookUrls.length}个，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ### \n`)

    const authorUrls = await this.getAuthors()
    this.logger.log(`### 作者链接共 ${authorUrls.length}个，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ### \n`)

    const menuUrls = await this.getMenusUrls()
    this.logger.log(`### 目录链接共 ${menuUrls.length}个，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ### \n`)

    this.logger.log(`### 开始生成 sitemap.xml 文件 ###`)
    try {
      const urls = [...navUrls, ...bookUrls, ...menuUrls, ...authorUrls]
      const stream = new SitemapStream({
        hostname: 'https://m.zjjdxr.com/',
        xmlns: { // trim the xml namespace
          news: false, // flip to false to omit the xml namespace for news
          xhtml: false,
          image: false,
          video: false,
        }
      })
      const res = await streamToPromise(Readable.from(urls).pipe(stream))
      fs.writeFileSync(`${siteMapPath}/sitemap.xml`, res.toString());
      this.logger.end(`### 【end】创建完成，共${urls.length}个url地址，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ### \n\n\n`);
      return '创建完成'
    } catch (error) {
      const text = `创建失败: ${error}`
      this.logger.end(`### 【end】${text}；当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ### \n\n\n`);
      return text
    }
  }
}
