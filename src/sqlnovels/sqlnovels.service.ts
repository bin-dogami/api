import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { novels } from './sqlnovels.entity';
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

  async findLastId(): Promise<any> {
    const novel = await this.sqlnovelsRepository.findOne({
      order: {
        id: "DESC"
      }
    });
    return novel && novel.id ? novel.id : getFirstNovelId();
  }

  async findById(id: number): Promise<novels> {
    return this.sqlnovelsRepository.findOne(
      {
        id,
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
    const novel = await this.findById(id);
    Object.assign(novel, fields);
    return await this.sqlnovelsRepository.save(novel);
  }

  // async findAll(): Promise<novels[]> {
  //   return this.sqlnovelsRepository.find();
  // }

  // async remove(id: string): Promise<void> {
  //   await this.sqlnovelsRepository.delete(id);
  // }
}
