import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { sqlauthors as authors } from './sqlauthors.entity';
import { CreateSqlauthors } from "./create-sqlauthors.dto";

@Injectable()
export class SqlauthorsService {
  constructor(
    @InjectRepository(authors)
    private readonly sqlauthorsRepository: Repository<authors>,
  ) { }

  async create(createSqlauthors: CreateSqlauthors): Promise<authors> {
    const oAuthor = this.sqlauthorsRepository.create(createSqlauthors);
    return await this.sqlauthorsRepository.save(oAuthor);
  }

  async getAuthors(skip: number, take?: number, getAllFields?: boolean): Promise<authors[]> {
    return await this.sqlauthorsRepository.find({
      select: getAllFields ? undefined : ["id", "name"],
      order: {
        id: "DESC",
        level: "DESC"
      },
      skip,
      take
    })
  }

  async findByAuthorName(name: string): Promise<authors[]> {
    return await this.sqlauthorsRepository.find({
      where: { name: Like(`%${name}%`) }
    });
  }

  async findOneByAuthorName(name: string): Promise<authors> {
    return await this.sqlauthorsRepository.findOne({
      where: { name }
    });
  }

  async findAll(): Promise<authors[]> {
    return await this.sqlauthorsRepository.find();
  }

  async findOne(id: number): Promise<authors> {
    return await this.sqlauthorsRepository.findOne(id);
  }

  async updateAuthor(author: authors): Promise<void> {
    await this.sqlauthorsRepository.save(author);
  }

  async remove(id: number) {
    return await this.sqlauthorsRepository.delete(id);
  }
}
