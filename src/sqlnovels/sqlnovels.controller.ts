import { Controller, Get, Post, Body, Param, HttpCode } from '@nestjs/common';
import { SqlnovelsService } from './sqlnovels.service';

@Controller('sqlnovels')
export class SqlnovelsController {
  constructor(private readonly sqlnovelsService: SqlnovelsService) { }

  // @Post()
  // getNovel() {
  //   return this.sqlnovelsService.create({
  //     id: 0,
  //     title: 'title',
  //     description: 'description',
  //     author: 'author1111',
  //     typeid: 'typeidtypeidtypeid',
  //     tags: ['tags', 'tags2'],
  //     from: ['from21'],
  //     viewnum: 2,
  //   });
  // }
}
