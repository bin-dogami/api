import { Module } from '@nestjs/common';
import { SqlerrorsService } from './sqlerrors.service';
import { SqlerrorsController } from './sqlerrors.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sqlerrors } from './sqlerrors.entity';

@Module({
  imports: [TypeOrmModule.forFeature([sqlerrors])],
  providers: [SqlerrorsService],
  controllers: [SqlerrorsController],
  exports: [SqlerrorsService]
})
export class SqlerrorsModule { }
