import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlnovelsService } from './sqlnovels.service';
import { SqlnovelsController } from './sqlnovels.controller';
import { sqlnovels as novels } from './sqlnovels.entity';

@Module({
  imports: [TypeOrmModule.forFeature([novels])],
  providers: [SqlnovelsService],
  controllers: [SqlnovelsController],
  exports: [SqlnovelsService],
})
export class SqlnovelsModule { }
