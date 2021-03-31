import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { sqlvisitors as visitors } from './sqlvisitors.entity';
import { CreateSqlvisitors } from "./create-sqlvisitors.dto";

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
