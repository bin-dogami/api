import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
