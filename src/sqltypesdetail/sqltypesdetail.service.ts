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

  async create(createSqltypesdetail: CreateSqltypesdetail): Promise<typesdetail> {
    const oTypes = this.sqltypesdetailRepository.create(createSqltypesdetail);
    return await this.sqltypesdetailRepository.save(oTypes);
  }

  async findAll(): Promise<typesdetail[]> {
    return await this.sqltypesdetailRepository.find();
  }

  async findOne(id: string): Promise<typesdetail> {
    return await this.sqltypesdetailRepository.findOne(id);
  }

  async getAllByNovelId(novelId: number): Promise<typesdetail[]> {
    return await this.sqltypesdetailRepository.find({
      select: ["id"],
      where: { novelId }
    });
  }

  async remove(id: number): Promise<void> {
    await this.sqltypesdetailRepository.delete(id);
  }

  async removeByNovelId(novelId: number): Promise<any> {
    return await this.sqltypesdetailRepository
      .createQueryBuilder()
      .delete()
      .where("novelId = :novelId", { novelId })
      .execute()
  }
}
