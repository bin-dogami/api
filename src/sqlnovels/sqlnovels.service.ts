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

  // 搜索
  async getBookByTitleId(title: string, id: number): Promise<novels> {
    // 第一页数据缓存一小时
    return await this.sqlnovelsRepository.findOne({
      select: ["id", "title", "author", "authorId", "description", "thumb"],
      where: id ? { title, id } : { title }
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
      select: ["id", "title", "author", "authorId"],
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

  async findLastId(): Promise<number> {
    const novel = await this.sqlnovelsRepository.findOne({
      order: {
        id: "DESC"
      }
    })
    return novel && novel.id ? novel.id : getFirstNovelId();
  }

  async findById(id: number, getAllFields?: boolean): Promise<novels> {
    return this.sqlnovelsRepository.findOne(
      {
        select: getAllFields ? undefined : ["id", "title", "author", "authorId", "typename", "description", "thumb", "isComplete"],
        where: { id },
      }
    );
  }

  async findByTitle(title: string, author: string): Promise<novels> {
    return this.sqlnovelsRepository.findOne(
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
}
