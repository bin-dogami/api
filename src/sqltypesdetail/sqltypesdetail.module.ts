import { Module } from '@nestjs/common';
import { SqltypesdetailService } from './sqltypesdetail.service';
import { SqltypesdetailController } from './sqltypesdetail.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sqltypesdetail as typesdetail } from './sqltypesdetail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([typesdetail])],
  providers: [SqltypesdetailService],
  controllers: [SqltypesdetailController],
  exports: [SqltypesdetailService]
})
export class SqltypesdetailModule { }
