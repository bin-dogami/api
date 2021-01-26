import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pages } from './sqlpages.entity';
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

  async findAll(): Promise<pages[]> {
    return this.sqlpagesRepository.find();
  }

  findOne(id: string): Promise<pages> {
    return this.sqlpagesRepository.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.sqlpagesRepository.delete(id);
  }
}
