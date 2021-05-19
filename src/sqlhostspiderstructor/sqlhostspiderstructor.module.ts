import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlhostspiderstructorService } from './sqlhostspiderstructor.service';
import { SqlhostspiderstructorController } from './sqlhostspiderstructor.controller';
import { sqlhostspiderstructor as hostspiderstructor } from './sqlhostspiderstructor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([hostspiderstructor])],
  providers: [SqlhostspiderstructorService],
  controllers: [SqlhostspiderstructorController],
  exports: [SqlhostspiderstructorService]
})
export class SqlhostspiderstructorModule { }
