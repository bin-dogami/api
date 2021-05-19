import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { sqlhostspiderstructor as hostspiderstructor } from './sqlhostspiderstructor.entity';
import { CreateSqlhostspiderstructor } from "./create-sqlhostspiderstructor.dto";
import { Mylogger } from '../mylogger/mylogger.service';


@Injectable()
export class SqlhostspiderstructorService {
  private readonly logger = new Mylogger(SqlhostspiderstructorService.name);

  constructor(
    @InjectRepository(hostspiderstructor)
    private readonly sqlhostspiderstructorRepository: Repository<hostspiderstructor>,
  ) { }

  async create(structor: CreateSqlhostspiderstructor): Promise<hostspiderstructor> {
    const oHostspiderstructor = this.sqlhostspiderstructorRepository.create(structor);
    return this.sqlhostspiderstructorRepository.save(oHostspiderstructor)
  }

  async getAll(): Promise<hostspiderstructor[]> {
    return await this.sqlhostspiderstructorRepository.find();
  }

  async findByHost(host: string): Promise<hostspiderstructor> {
    return await this.sqlhostspiderstructorRepository.findOne(
      {
        where: { host },
      }
    );
  }

  async remove(id: number): Promise<any> {
    return await this.sqlhostspiderstructorRepository.delete(id);
  }

  async save(o): Promise<any> {
    return await this.sqlhostspiderstructorRepository.save(o)
  }
}
