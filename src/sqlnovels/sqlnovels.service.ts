import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, LessThan } from 'typeorm';
import { sqlnovels as novels } from './sqlnovels.entity';
import { CreateSqlnovels } from "./create-sqlnovels.dto";
import { getFirstNovelId } from '../utils/index'

@Injectable()
export class SqlnovelsService {
  constructor(
    @InjectRepository(novels)
    private readonly sqlnovelsRepository: Repository<novels>,
  ) { }

  async create(createSqlnovels: CreateSqlnovels): Promise<novels> {
    const oBooks = this.sqlnovelsRepository.create(createSqlnovels);
    return await this.sqlnovelsRepository.save(oBooks);
  }

  // 主页用
  async getIndexBooksByType(typeid: number, size?: number): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      select: ["id", "title", "author", "authorId", "description", "thumb"],
      where: { typeid, isOnline: true },
      order: {
        // @TODO: 首页书 先以书 id 倒序吧
        id: "DESC",
      },
      take: size || 6
    })
  }

  async getBookByIds(novelIds: number[], getOnline?: number, getPartsFields?: boolean): Promise<novels[]> {
    // getOnline 为0或不传时，不分上线不上线，为1时，只查上线的，为2时，只查不上线的
    const online: any = {}
    if (getOnline > 0) {
      online.isOnline = getOnline === 1
    }
    return await this.sqlnovelsRepository.find({
      select: getPartsFields ? ["id", "title", "author", "authorId", "description", "thumb"] : undefined,
      where: { id: In(novelIds), ...online },
    })
  }

  // 搜索
  async getBookByTitleWithLike(name: string, getOnline?: number): Promise<novels[]> {
    // getOnline 为0或不传时，不分上线不上线，为1时，只查上线的，为2时，只查不上线的
    const online: any = {}
    if (getOnline > 0) {
      online.isOnline = getOnline === 1
    }
    return await this.sqlnovelsRepository.find({
      select: ["id", "title", "author", "authorId", 'description', 'thumb'],
      where: {
        title: Like(`%${name}%`),
        ...online
      },
      order: {
        viewnum: "DESC"
      },
      take: 10
    })
  }

  async getBooksByType(typeid: number, skip: number, size?: number): Promise<novels[]> {
    const w1 = typeid === 0 ? {} : { typeid }
    return await this.sqlnovelsRepository.find({
      select: ["id", "title", "author", "authorId", "description", "thumb"],
      where: {
        isOnline: true,
        ...w1
      },
      order: {
        id: "DESC",
        viewnum: "DESC"
      },
      skip,
      take: size && size <= 50 ? size : 20,
    })
  }

  async getBooksByCompleted(skip: number, size?: number): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      select: ["id", "title", "author", "authorId", "description", "thumb"],
      where: { isComplete: true, isOnline: true },
      order: {
        id: "DESC",
        viewnum: "DESC"
      },
      skip,
      take: size && size <= 50 ? size : 20,
    })
  }

  // @TODO: 后台里处理一下这种情况， 获取所有需要再次抓取的书（非全本并抓完的书）
  async getUnCompleteSpiderNovels(): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      select: ["id"],
      where: { isSpiderComplete: false },
      order: {
        id: "ASC"
      },
    })
  }

  // 获取一段日期之间的列表, online: {1: 全部, 2: 未上线, 3: 已上线}
  async getBooksByCreateDate(sDate: string, eDate: string, online: number): Promise<novels[]> {
    const isOnline: boolean | boolean[] = online === 1 ? [true, false] : (online === 2 ? false : true)
    const onlineWhere = Array.isArray(isOnline) ? "IN (:...isOnline)" : "= :isOnline"

    return await this.sqlnovelsRepository
      .createQueryBuilder("novels")
      .select("id")
      .addSelect("title")
      .addSelect("updatetime")
      .addSelect("isOnline")
      .addSelect("menusLen")
      .addSelect("isComplete")
      .where("ctime >= :sDate", { sDate })
      .andWhere("ctime < :eDate", { eDate: eDate || '2100-01-01' })
      .andWhere(`isOnline ${onlineWhere}`, { isOnline })
      .orderBy("id", 'DESC')
      .execute()
  }

  async findLastId(): Promise<number> {
    const novel = await this.sqlnovelsRepository.findOne({
      order: {
        id: "DESC"
      }
    })
    return novel && novel.id ? novel.id : getFirstNovelId();
  }

  async findById(id: number, getAllFields?: boolean): Promise<novels> {
    return await this.sqlnovelsRepository.findOne(
      {
        select: getAllFields ? undefined : ["id", "title", "author", "authorId", "typeid", "typename", "description", "thumb", "isComplete"],
        where: { id },
      }
    );
  }

  async getTotal(): Promise<number> {
    const data = await this.sqlnovelsRepository
      .createQueryBuilder("novels")
      .select("count(*)", "total")
      .execute()
    return data.length && data[0] ? data[0].total : 0
  }

  async findByOriginalTitle(otitle: string, author: string): Promise<novels> {
    return await this.sqlnovelsRepository.findOne(
      {
        otitle,
        author,
      }
    );
  }

  async findByTitle(title: string, author: string): Promise<novels> {
    return await this.sqlnovelsRepository.findOne(
      {
        title,
        author,
      }
    );
  }

  async updateFields(id: number, fields: any): Promise<any> {
    const novel = await this.findById(id, true);
    if (!novel) {
      return '保存失败，找不到书本信息'
    }
    Object.assign(novel, fields);
    return await this.saveNovel(novel);
  }

  async saveNovel(novel: novels): Promise<novels> {
    return await this.sqlnovelsRepository.save(novel);
  }

  async remove(id: number): Promise<void> {
    await this.sqlnovelsRepository.delete(id);
  }

  async getAllBooks(): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      order: {
        id: 'ASC'
      }
    });
  }

  async getBooksWhereLtId(id: number): Promise<[novels[], number]> {
    return await this.getBooksByParams({
      where: {
        id: LessThan(id)
      },
      order: {
        id: 'ASC'
      }
    })
  }

  async getBooksByParams(params: any): Promise<[novels[], number]> {
    return await this.sqlnovelsRepository.findAndCount({
      ...params
    });
  }

  // 批量设置书本线上可访问
  async batchSetBooksOnline(ids: number[]): Promise<any> {
    return await this.sqlnovelsRepository.createQueryBuilder()
      .update()
      .set({ isOnline: true })
      .where("id IN (:...ids)", { ids })
      .execute()
  }

  // 设置所有未上线的书本上线
  async setAllBooksOnline(): Promise<any> {
    return await this.sqlnovelsRepository.createQueryBuilder()
      .update()
      .set({ isOnline: true })
      .where("isOnline = :online", { online: false })
      .execute()
  }

  // @NOTE: 主要给 sitemap 用，完本的书和非完本的分两次取，因为要根据更新时间来分权重，而完本的可能不更新了，时间也不一样
  async getCompleteOrNotBooks(isSpiderComplete: boolean, take: number): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      select: ["id", "updatetime"],
      where: { isSpiderComplete, isOnline: true },
      order: {
        updatetime: "DESC"
      },
      take
    })
  }
}
