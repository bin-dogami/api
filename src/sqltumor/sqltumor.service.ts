import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqltumor } from './sqltumor.entity';
import { CreateSqltumor } from "./create-sqltumor.dto";

@Injectable()
export class SqltumorService {
  constructor(
    @InjectRepository(sqltumor)
    private readonly sqltumorRepository: Repository<sqltumor>,
  ) { }

  create(createSqltumor: CreateSqltumor): Promise<sqltumor> {
    const oTumor = this.sqltumorRepository.create(createSqltumor);
    return this.sqltumorRepository.save(oTumor);
  }

  async findList(host: string): Promise<any[]> {
    const where = host ? { where: { host } } : {}
    return this.sqltumorRepository.find({
      ...where,
      order: {
        id: 'DESC'
      },
      take: 100
    });
  }

  async remove(id: number): Promise<any> {
    return await this.sqltumorRepository.delete(id)
  }
}
