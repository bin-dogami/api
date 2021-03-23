import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { sqlspider } from './sqlspider.entity';
import { CreateSqlspider } from "./create-sqlspider.dto";

export { CreateSqlspider }

// 每次抓取前把状态  1 改为 0
export enum ISpiderStatus {
  UNSPIDER = 0,
  SPIDERING = 1,
  SPIDERED = 2,
  FAILDED_SPIDER = 3,
}

// @TODO: 建一个页面查看所有抓取状态及数据
export const SpiderStatus = {
  [ISpiderStatus.UNSPIDER]: '待抓取',
  [ISpiderStatus.SPIDERING]: '抓取中',
  [ISpiderStatus.SPIDERED]: '抓取完成',
  [ISpiderStatus.FAILDED_SPIDER]: '抓取异常'
}

@Injectable()
export class SqlspiderService {
  constructor(
    @InjectRepository(sqlspider)
    private readonly sqlspiderRepository: Repository<sqlspider>,
  ) { }

  async create(id: number, status?: number): Promise<sqlspider | string> {
    const oSpider = this.sqlspiderRepository.create({
      id,
      status: status === undefined ? ISpiderStatus.UNSPIDER : status,
      text: ''
    });
    const one = await this.getById(oSpider.id)
    if (one) {
      return '此数据已有';
    }
    return await this.sqlspiderRepository.save(oSpider);
  }

  async getById(id: number): Promise<sqlspider> {
    return await this.sqlspiderRepository.findOne({
      where: {
        id
      }
    })
  }

  async isSpidering(id: number): Promise<boolean> {
    const spider = await this.getById(id)
    return spider && spider.status === ISpiderStatus.SPIDERING
  }

  async findAllByStatus(status: number, take?: number): Promise<any[]> {
    const params: any = status === -1 ? {} : { where: { status } }
    if (take) {
      params.take = take > 100 ? 100 : take
    }
    return await this.sqlspiderRepository.find({
      order: {
        status: 'ASC',
        updatetime: 'DESC'
      },
      ...params,
    });
  }

  // @TODO: 这块改了，确认下不影响 getbook 里的接口。 获取下一个待抓取书id，id 可以为0，为0 就是第一条
  async getNextUnspider(id: number): Promise<number> {
    const spider = await this.sqlspiderRepository.findOne({
      select: ["id"],
      where: {
        id: MoreThan(id),
        status: ISpiderStatus.UNSPIDER
      },
      order: {
        id: "ASC"
      },
    })
    return spider ? spider.id : 0
  }

  // 设置某本书抓取失败状态
  async setFailedSpider(id: number, text: string) {
    const spider = await this.getById(id)
    Object.assign(spider, {
      text,
      status: ISpiderStatus.FAILDED_SPIDER,
    })
    await this.update(spider)
  }

  // // 更改当前在抓取中的状态为抓取完
  // async stopCurrentSpidering() {
  //   return await this.sqlspiderRepository.createQueryBuilder("spiders")
  //     .update()
  //     .set({ status: ISpiderStatus.SPIDERED })
  //     .where("status = :status", { status: ISpiderStatus.SPIDERING })
  //     .execute()
  // }

  // 更改抓取中的书状态为已抓取完
  async stopAllSpidering() {
    return await this.sqlspiderRepository.createQueryBuilder("spiders")
      .update()
      .set({ status: ISpiderStatus.SPIDERED })
      .where("status = :status", { status: ISpiderStatus.SPIDERING })
      .execute()
  }

  async completeSpider(id: number, text?: string) {
    const spider = await this.getById(id)
    if (!spider) {
      return '找不到此书id对应的spider数据'
    }
    spider.status = ISpiderStatus.SPIDERED
    text && (spider.text = text)
    return await this.update(spider)
  }

  // 把已抓取完的统一改为待抓取状态以便开始抓取
  async setSpideredToUnSpider() {
    return await this.sqlspiderRepository.createQueryBuilder("spiders")
      .update()
      .set({ status: ISpiderStatus.UNSPIDER })
      .where("status = :status", { status: ISpiderStatus.SPIDERED })
      .execute()
  }

  async update(oSpider: CreateSqlspider): Promise<sqlspider> {
    return await this.sqlspiderRepository.save(oSpider)
  }

  async remove(id: number): Promise<any> {
    return await this.sqlspiderRepository.delete(id)
  }

  async getAll(): Promise<sqlspider[]> {
    return await this.sqlspiderRepository.find();
  }
}
