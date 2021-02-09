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

  create(createSqltypes: CreateSqltypes): Promise<types> {
    const oTypes = this.sqltypesRepository.create(createSqltypes);
    return this.sqltypesRepository.save(oTypes);
  }

  async findAll(isTag: boolean): Promise<types[]> {
    return this.sqltypesRepository.find({
      select: ["id", "name"],
      where: { isTag }
    });
  }

  async findOne(id: number): Promise<types> {
    return this.sqltypesRepository.findOne(id);
  }

  async findOneByName(name: string): Promise<types> {
    return this.sqltypesRepository.findOne({ name });
  }

  async remove(id: number): Promise<void> {
    await this.sqltypesRepository.delete(id);
  }
}
