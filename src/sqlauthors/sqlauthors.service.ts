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

  async getAuthors(skip: number, size?: number): Promise<authors[]> {
    return await this.sqlauthorsRepository.find({
      select: ["id", "name"],
      order: {
        level: "DESC"
      },
      skip,
      take: size && size <= 50 ? size : 20,
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
}
