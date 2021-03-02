import { Module } from '@nestjs/common';
import { SqlspiderService } from './sqlspider.service';
import { SqlspiderController } from './sqlspider.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sqlspider } from './sqlspider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([sqlspider])],
  providers: [SqlspiderService],
  controllers: [SqlspiderController],
  exports: [SqlspiderService]
})
export class SqlspiderModule { }
