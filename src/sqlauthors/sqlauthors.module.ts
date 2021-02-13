import { Module } from '@nestjs/common';
import { SqlauthorsService } from './sqlauthors.service';
import { SqlauthorsController } from './sqlauthors.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sqlauthors as authors } from './sqlauthors.entity';

@Module({
  imports: [TypeOrmModule.forFeature([authors])],
  providers: [SqlauthorsService],
  controllers: [SqlauthorsController],
  exports: [SqlauthorsService]
})
export class SqlauthorsModule { }
