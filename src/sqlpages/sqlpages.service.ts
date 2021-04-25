import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { sqlpages as pages } from './sqlpages.entity';
import { CreateSqlpages } from "./create-sqlpages.dto";

@Injectable()
export class SqlpagesService {
  constructor(
    @InjectRepository(pages)
    private readonly sqlpagesRepository: Repository<pages>,
  ) { }

  async create(createSqlpages: CreateSqlpages): Promise<pages> {
    const oPages = this.sqlpagesRepository.create(createSqlpages);
    return await this.sqlpagesRepository.save(oPages);
  }

  async findOne(id: number): Promise<pages> {
    return await this.sqlpagesRepository.findOne(id);
  }

  async findAll(novelId: number): Promise<pages[]> {
    return await this.sqlpagesRepository.find({
      where: { novelId }
    });
  }

  async save(oPages) {
    await this.sqlpagesRepository.save(oPages)
  }

  async remove(id: number): Promise<void> {
    await this.sqlpagesRepository.delete(id);
  }

  async removeByNovelId(novelId: number): Promise<any> {
    return await this.sqlpagesRepository
      .createQueryBuilder()
      .delete()
      .where("novelId = :novelId", { novelId })
      .execute()
  }

  // 删除大于等于目录id的数据
  async batchDeleteGtPages(id: number, novelId: number, notEq?: boolean): Promise<any> {
    const gtId = notEq ? 'id > :id' : 'id >= :id'
    return await this.sqlpagesRepository
      .createQueryBuilder()
      .delete()
      .where("novelId = :novelId", { novelId })
      .andWhere(gtId, { id })
      .execute()
  }

  // 获取完整内容，有nextId 就持续遍历再合到一个 content 上
  // @TODO: 一章内容特别特别多时候就不应该一次性取完了
  async getWholeContent(page: any, content: string) {
    if (!page.nextId) {
      return content
    }

    const nextPage: any = await this.sqlpagesRepository.findOne(page.nextId)
    if (nextPage) {
      return await this.getWholeContent(nextPage, content + nextPage.content)
    }
    return content
  }

  async getListGtId(id: number, take: number): Promise<pages[]> {
    return await this.sqlpagesRepository.find({
      select: ["id", "content"],
      where: {
        id: MoreThan(id)
      },
      order: {
        id: 'ASC'
      },
      take
    })
  }

  async getLastId(): Promise<pages> {
    return await this.sqlpagesRepository.findOne({
      select: ["id", "novelId"],
      order: {
        id: 'DESC'
      }
    })
  }
}
