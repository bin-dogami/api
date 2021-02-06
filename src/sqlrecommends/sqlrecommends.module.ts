import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlrecommendsService } from './sqlrecommends.service';
import { SqlrecommendsController } from './sqlrecommends.controller';
import { sqlrecommends as recommends } from './sqlrecommends.entity';

@Module({
  imports: [TypeOrmModule.forFeature([recommends])],
  providers: [SqlrecommendsService],
  controllers: [SqlrecommendsController],
  exports: [SqlrecommendsService]
})
export class SqlrecommendsModule { }
