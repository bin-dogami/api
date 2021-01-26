import { Module } from '@nestjs/common';
import { SqlpagesService } from './sqlpages.service';
import { SqlpagesController } from './sqlpages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { pages } from './sqlpages.entity';

@Module({
  imports: [TypeOrmModule.forFeature([pages])],
  providers: [SqlpagesService],
  controllers: [SqlpagesController],
  exports: [SqlpagesService],
})
export class SqlpagesModule { }
