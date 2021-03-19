import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
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
      where: { typeid },
      order: {
        viewnum: "DESC"
      },
      take: size || 6
    })
  }

  async getBookByIds(novelIds: number[]): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      select: ["id", "title", "author", "authorId", "description", "thumb"],
      where: { id: In(novelIds) },
    })
  }

  // 搜索
  async getBookByTitleWithLike(name: string): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      select: ["id", "title", "author", "authorId", 'description', 'thumb'],
      where: {
        title: Like(`%${name}%`)
      },
      order: {
        viewnum: "DESC"
      },
      take: 10
    })
  }

  async getBooksByType(typeid: number, skip: number, size?: number): Promise<novels[]> {
    const where = typeid === 0 ? {} : {
      where: { typeid }
    }
    return await this.sqlnovelsRepository.find({
      select: ["id", "title", "author", "authorId", "description", "thumb"],
      ...where,
      order: {
        viewnum: "DESC"
      },
      skip,
      take: size && size <= 50 ? size : 20,
    })
  }

  async getBooksByCompleted(skip: number, size?: number): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      select: ["id", "title", "author", "authorId", "description", "thumb"],
      where: { isComplete: true },
      order: {
        viewnum: "DESC"
      },
      skip,
      take: size && size <= 50 ? size : 20,
    })
  }

  // 获取所有需要再次抓取的书（非全本并抓完的书）
  async getUnCompleteSpiderNovels(): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      select: ["id"],
      where: { isSpiderComplete: false },
      order: {
        id: "ASC"
      },
    })
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
        select: getAllFields ? undefined : ["id", "title", "author", "authorId", "typename", "description", "thumb", "isComplete"],
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
    return await this.sqlnovelsRepository.find();
  }

  // {1: '未完降序', 2: '未完升序', 3: '完本降序', 4: '完本升序'}
  async getLastBooks(order?: string, num?: number): Promise<novels[]> {
    return await this.sqlnovelsRepository.find({
      where: {
        isComplete: ['3', '4'].includes(order)
      },
      order: {
        ctime: ['2', '4'].includes(order) ? 'ASC' : 'DESC'
      },
      take: num || 100
    });
  }
}
