import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlvisitorsService } from './sqlvisitors.service';
import { SqlvisitorsController } from './sqlvisitors.controller';
import { sqlvisitors as visitors } from './sqlvisitors.entity';

@Module({
  imports: [TypeOrmModule.forFeature([visitors])],
  providers: [SqlvisitorsService],
  controllers: [SqlvisitorsController],
  exports: [SqlvisitorsService]
})
export class SqlvisitorsModule { }
