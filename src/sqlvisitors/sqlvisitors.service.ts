import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { sqlvisitors as visitors } from './sqlvisitors.entity';
import { CreateSqlvisitors } from "./create-sqlvisitors.dto";
import { Mylogger } from '../mylogger/mylogger.service';
import { Cron, Interval } from '@nestjs/schedule';

const dayjs = require('dayjs')
const fs = require('fs');
const logFilePath = process.env.NODE_ENV === 'development' ? './logs' : '/root/nginx_logs'
const path = require('path')

// test text: '111.206.198.87 - - [30/Mar/2021:16:37:03 +0800] "GET /js/flexible.js HTTP/1.1" 200 1026 "https://m.zjjdxr.com/page/3023905" "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1 (compatible; Baiduspider-render/2.0; +http://www.baidu.com/search/spider.html)"'
const analysisLog = (text: string) => {
  // 先把引号和日期(括号)的分割出来，再逐项替换，有[]和" 的去掉首尾这两符号，没有的按空格再分割，再去掉空项，返回拼接好的数组
  let list: string[] = text.replace(/""/g, '"-"').split(/("[^"]+")/)
  list = list.reduce((arr: string[], str: string) => {
    const trimsStr = str ? str.trim() : ""
    // undefined 或 trim为空的
    if (!trimsStr.length) {
      return arr
    }
    const _str = trimsStr.replace(/"/g, '').trim()
    if (_str.length) {
      return [...arr, _str]
    }
    return arr
  }, [])
  return list
}

@Injectable()
export class SqlvisitorsService {
  private readonly logger = new Mylogger(SqlvisitorsService.name);

  constructor(
    @InjectRepository(visitors)
    private readonly sqlvisitorsRepository: Repository<visitors>,
  ) { }

  // 不传日期，就读今天的
  async readLog(_date: string, host: string): Promise<any> {
    const date = _date || dayjs().format('YYYY-MM-DD')
    const logPath = path.resolve(`${logFilePath}/${date}-${host}.log`);
    if (!fs.existsSync(logPath)) {
      return '找不到日志目录'
    }
    try {
      const data = fs.readFileSync(logPath)
      const list = data.toString().split('\n')
      return list.map((text) => {
        return text.trim().length ? analysisLog(text) : null
      }).filter((item) => !!item)
    } catch (error) {
      return `读取日志文 ${logPath} 错误: ${error}`
    }
  }


  // https://segmentfault.com/a/1190000022125108?utm_source=sf-similar-article
  async saveLogs(date: string, host: string): Promise<any> {
    if (!['m', 'ttttt5'].includes(host)) {
      return 'host参数不对'
    }

    const logs = await this.readLog(date, host)
    if (!Array.isArray(logs)) {
      return logs
    }
    const lastLog = await this.findLastOne()
    this.logger.start(`### 【start】开始把nginx日志收集到数据库中，当前时间是 ${dayjs().format('YYYY-MM-DD HH:mm')} ###`, this.logger.createNginxLogCollectErrorsFile())
    let successLen = 0
    let failedLen = 0
    while (logs.length) {
      const [ip, user, ctime, url, status, bytes, referer, use_agent, http_x_forwarded_for] = logs.shift()
      // 静态资源不记录
      if (/.+.(js|css|ico|png|gif|jpg|jpeg|svg)\b/.test(url) || url.includes('_next/')) {
        continue;
      }
      // 已添加过的就不添加了
      if (lastLog && dayjs(ctime).diff(dayjs(lastLog.ctime)) <= 0) {
        continue;
      }
      const fSpider = 'sogou|so|haosou|baidu|google|youdao|yahoo|bing|gougou|118114|vnet|360|ioage|sm|sp'.split('|').filter((s) => use_agent.includes(s))
      // {normal: 不是搜索引擎蜘蛛, multiSpider: 多个搜索引擎蜘蛛的其实是伪装的, [其他]: 搜索引擎蜘蛛}
      let spider = fSpider.length ? (fSpider.length > 1 ? 'multiSpider' : fSpider[0]) : 'normal'
      if (use_agent.includes('Baiduspider')) {
        spider = 'Baiduspider'
      }

      const data = {
        ip,
        host,
        // 伪装一下吧
        user: user === 'ob' ? 'laowang' : user,
        spider,
        cDate: dayjs(ctime).format('YYYY-MM-DD'),
        ctime,
        url,
        status: +status,
        bytes: +bytes,
        referer,
        use_agent,
        http_x_forwarded_for
      }
      try {
        await this.create(data)
        successLen++
      } catch (error) {
        this.logger.log(`### 写入数据库错误: ${JSON.stringify(data)}；错误信息：${error} ### \n`);
        failedLen++
      }
    }
    const text = `记录日志完毕, 成功了 ${successLen} 条, 失败了 ${failedLen} 条`
    this.logger.end(`### 【end】${text} ### \n\n\n`);
    return text
  }

  async collectNginxLogs() {
    const mRes = await this.saveLogs('', 'm')
    const adminRe = await this.saveLogs('', 'ttttt5')
    return `m站： ${mRes} ；后台：${adminRe} `
  }

  // https://docs.nestjs.cn/7/techniques?id=%e5%ae%9a%e6%97%b6%e4%bb%bb%e5%8a%a1
  // @TODO: 定时任务，如果数据量特别大了，应该每次执行完了就把 文件重命名一下，然后让它自动生成新的文件
  // 每个小时， 从第 30 分钟 第 1 秒开始执行一次
  @Cron('1 30 * * * *')
  everyHourExcuteOneTime() {
    this.collectNginxLogs()
  }

  // 每天 晚上 12 点前执行一次
  @Cron('30 59 23 * * *')
  handleInterval() {
    this.collectNginxLogs()
  }

  async create(createSqlvisitors: CreateSqlvisitors): Promise<visitors> {
    const oVisitor = this.sqlvisitorsRepository.create(createSqlvisitors);
    return await this.sqlvisitorsRepository.save(oVisitor);
  }

  async getList(skip: number, size: number, host: string, sDate: string, eDate: string, spider: string): Promise<[visitors[], any[]]> {
    const hostWhere = host ? 'host = :host' : 'host != :host'
    const spiderWhere = spider === 'normal' ? 'spider = :spider' : 'spider != :spider'
    // {全部: spider != '', 只看spider: spider != 'normal', 不看spider: spider = 'normal'}
    const _spider = spider ? 'normal' : ''

    const queryBuilder = this.sqlvisitorsRepository
      .createQueryBuilder("visitors")
      .where(hostWhere, { host: host || '' })
      .andWhere(spiderWhere, { spider: _spider })
      .andWhere("ctime >= :sDate", { sDate })
      .andWhere("ctime < :eDate", { eDate })

    return [
      // list
      await queryBuilder
        .orderBy("id", 'DESC')
        .offset(skip)
        .limit(size || 100)
        .select("*")
        .execute(),

      // count，=0 是个空数据，>0 是个[{total: 122}]
      await queryBuilder
        .select("count(*)", "total")
        .execute()
    ]
  }

  async getAll(): Promise<visitors[]> {
    return await this.sqlvisitorsRepository.find();
  }

  async findById(id: number): Promise<visitors> {
    return await this.sqlvisitorsRepository.findOne(
      {
        where: { id },
      }
    );
  }

  async findLastOne(): Promise<visitors> {
    return await this.sqlvisitorsRepository.findOne(
      {
        order: { id: 'DESC' },
      }
    );
  }

  async remove(id: number): Promise<any> {
    return await this.sqlvisitorsRepository.delete(id);
  }

  async save(o): Promise<any> {
    return await this.sqlvisitorsRepository.save(o)
  }
}
