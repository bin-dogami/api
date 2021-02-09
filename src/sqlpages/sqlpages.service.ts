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

  create(createSqlpages: CreateSqlpages): Promise<pages> {
    const oPages = this.sqlpagesRepository.create(createSqlpages);
    return this.sqlpagesRepository.save(oPages);
  }

  findOne(id: number): Promise<pages> {
    return this.sqlpagesRepository.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.sqlpagesRepository.delete(id);
  }
}
