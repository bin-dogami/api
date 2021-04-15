import { Module } from '@nestjs/common';
import { SqldatahandlerService } from './sqldatahandler.service';
import { SqldatahandlerController } from './sqldatahandler.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sqldatahandler } from './sqldatahandler.entity';

@Module({
  imports: [TypeOrmModule.forFeature([sqldatahandler])],
  providers: [SqldatahandlerService],
  controllers: [SqldatahandlerController],
  exports: [SqldatahandlerService]
})
export class SqldatahandlerModule { }
