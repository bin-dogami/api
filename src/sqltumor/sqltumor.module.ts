import { Module } from '@nestjs/common';
import { SqltumorService } from './sqltumor.service';
import { SqltumorController } from './sqltumor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sqltumor } from './sqltumor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([sqltumor])],
  providers: [SqltumorService],
  controllers: [SqltumorController],
  exports: [SqltumorService]
})
export class SqltumorModule { }
