import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqltypesdetail as typesdetail } from './sqltypesdetail.entity';
import { CreateSqltypesdetail } from "./create-sqltypesdetail.dto";

@Injectable()
export class SqltypesdetailService {
  constructor(
    @InjectRepository(typesdetail)
    private readonly sqltypesdetailRepository: Repository<typesdetail>,
  ) { }

  create(createSqltypesdetail: CreateSqltypesdetail): Promise<typesdetail> {
    const oTypes = this.sqltypesdetailRepository.create(createSqltypesdetail);
    return this.sqltypesdetailRepository.save(oTypes);
  }

  async findAll(): Promise<typesdetail[]> {
    return this.sqltypesdetailRepository.find();
  }

  findOne(id: string): Promise<typesdetail> {
    return this.sqltypesdetailRepository.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.sqltypesdetailRepository.delete(id);
  }
}
