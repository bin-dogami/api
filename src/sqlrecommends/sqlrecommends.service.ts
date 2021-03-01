import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlrecommends as recommends } from './sqlrecommends.entity';
import { CreateSqlrecommends } from "./create-sqlrecommends.dto";



@Injectable()
export class SqlrecommendsService {
  constructor(
    @InjectRepository(recommends)
    private readonly SqlrecommendsRepository: Repository<recommends>,
  ) { }

  async create(createSqlrecommends: CreateSqlrecommends): Promise<recommends> {
    const oTypes = this.SqlrecommendsRepository.create(createSqlrecommends);
    return await this.SqlrecommendsRepository.save(oTypes);
  }

  async getList(skip: number, size?: number): Promise<recommends[]> {
    return await this.SqlrecommendsRepository.find({
      order: {
        level: "DESC",
        index: "DESC"
      },
      skip,
      take: size && size <= 100 ? size : 20,
    });
  }

  async findById(id: number): Promise<recommends> {
    return await this.SqlrecommendsRepository.findOne(
      {
        where: { id },
      }
    );
  }

  async findLastLevel(): Promise<number> {
    const novel = await this.SqlrecommendsRepository.findOne({
      order: {
        level: "DESC"
      }
    });
    return novel && novel.level ? novel.level : 0;
  }

  // 更改id对应的书的推荐级为最高或取消最高(toZero === true 时取消)
  async udpateLevel(id: number, toZero?: boolean): Promise<any> {
    const o = await this.findById(id);
    o.level = toZero ? 0 : await this.findLastLevel() + 1;
    return await this.SqlrecommendsRepository.save(o);
  }

  async remove(id: number): Promise<any> {
    return await this.SqlrecommendsRepository.delete(id);
  }

  async save(o): Promise<any> {
    return await this.SqlrecommendsRepository.save(o)
  }
}
