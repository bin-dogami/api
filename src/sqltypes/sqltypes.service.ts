import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqltypes as types } from './sqltypes.entity';
import { CreateSqltypes } from "./create-sqltypes.dto";

@Injectable()
export class SqltypesService {
  constructor(
    @InjectRepository(types)
    private readonly sqltypesRepository: Repository<types>,
  ) { }

  async create(createSqltypes: CreateSqltypes): Promise<types> {
    const oTypes = this.sqltypesRepository.create(createSqltypes);
    return await this.sqltypesRepository.save(oTypes);
  }

  async findAll(isTag: boolean): Promise<types[]> {
    const types = await this.sqltypesRepository.find({
      select: ["id", "name"],
      where: { isTag }
    });
    types.forEach((item, index) => {
      if (item.name === '其他小说') {
        types.push(types.splice(index, 1)[0])
      }
    })
    return types
  }

  async findOne(id: number): Promise<types> {
    return await this.sqltypesRepository.findOne(id);
  }

  async findOneByName(name: string): Promise<types> {
    return await this.sqltypesRepository.findOne({ name });
  }

  async remove(id: number): Promise<void> {
    await this.sqltypesRepository.delete(id);
  }
}
