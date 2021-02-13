import { Controller, Get, Post, Body, Param, HttpCode } from '@nestjs/common';
import { SqlnovelsService } from './sqlnovels.service';

@Controller('sqlnovels')
export class SqlnovelsController {
  constructor(private readonly sqlnovelsService: SqlnovelsService) { }
}
