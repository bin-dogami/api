import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlvisitors as visitors } from './sqlvisitors.entity';
import { CreateSqlvisitors } from "./create-sqlvisitors.dto";

@Injectable()
export class SqlvisitorsService {
  constructor(
    @InjectRepository(visitors)
    private readonly sqlvisitorsRepository: Repository<visitors>,
  ) { }

  async create(createSqlvisitors: CreateSqlvisitors): Promise<visitors> {
    const oVisitor = this.sqlvisitorsRepository.create(createSqlvisitors);
    return await this.sqlvisitorsRepository.save(oVisitor);
  }

  async getList(skip: number, size?: number, spider?: string, host?: string): Promise<[visitors[], number]> {
    return await this.sqlvisitorsRepository.findAndCount({
      where: {
        spider: spider || undefined,
        host: host || undefined
      },
      order: {
        ctime: 'DESC'
      },
      skip,
      take: size && size <= 100 ? size : 20,
    });
  }

  async getAll(): Promise<visitors[]> {
    return await this.sqlvisitorsRepository.find();
  }

  async findById(id: number): Promise<visitors> {
    return await this.sqlvisitorsRepository.findOne(
      {
        where: { id },
      }
    );
  }

  async remove(id: number): Promise<any> {
    return await this.sqlvisitorsRepository.delete(id);
  }

  async save(o): Promise<any> {
    return await this.sqlvisitorsRepository.save(o)
  }
}
