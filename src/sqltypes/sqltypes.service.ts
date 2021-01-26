import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { types } from './sqltypes.entity';
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

  async findAll(): Promise<types[]> {
    return this.sqltypesRepository.find();
  }

  async findOne(id: string): Promise<types> {
    return this.sqltypesRepository.findOne(id);
  }

  async findOneByName(name: string): Promise<types> {
    return this.sqltypesRepository.findOne({ name });
  }

  async remove(id: string): Promise<void> {
    await this.sqltypesRepository.delete(id);
  }
}
