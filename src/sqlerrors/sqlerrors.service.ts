import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlerrors } from './sqlerrors.entity';
import { CreateSqlerrors } from "./create-sqlerrors.dto";

export enum IErrors {
  MENU_INSERT_FAILED = 'menu_insert_failed',
  PAGE_LOST = 'page_lost',
}
export const ErrorTypes = {
  [IErrors.MENU_INSERT_FAILED]: '目录插入失败',
  [IErrors.PAGE_LOST]: 'page缺失'
}

@Injectable()
export class SqlerrorsService {
  constructor(
    @InjectRepository(sqlerrors)
    private readonly sqlerrorsRepository: Repository<sqlerrors>,
  ) { }

  create(createSqlerrors: CreateSqlerrors): Promise<sqlerrors> {
    const oError = this.sqlerrorsRepository.create(createSqlerrors);
    return this.sqlerrorsRepository.save(oError);
  }

  async getSqlerrors(skip: number, size?: number): Promise<sqlerrors[]> {
    return await this.sqlerrorsRepository.find({
      skip,
      take: size && size <= 200 ? size : 20,
    })
  }

  async findOneByAuthorName(name: string): Promise<sqlerrors> {
    return this.sqlerrorsRepository.findOne({
      where: { name }
    });
  }

  async findAll(): Promise<sqlerrors[]> {
    return this.sqlerrorsRepository.find();
  }

  async findOne(id: number): Promise<sqlerrors> {
    return this.sqlerrorsRepository.findOne(id);
  }

  async updateNovelIds(author: sqlerrors): Promise<void> {
    await this.sqlerrorsRepository.save(author);
  }
}
