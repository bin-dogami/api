import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqltypesService } from './sqltypes.service';
import { SqltypesController } from './sqltypes.controller';
import { sqltypes as types } from './sqltypes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([types])],
  providers: [SqltypesService],
  controllers: [SqltypesController],
  exports: [SqltypesService]
})
export class SqltypesModule { }
