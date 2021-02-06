import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlmenusService } from './sqlmenus.service';
import { SqlmenusController } from './sqlmenus.controller';
import { sqlmenus as menus } from './sqlmenus.entity';

@Module({
  imports: [TypeOrmModule.forFeature([menus])],
  providers: [SqlmenusService],
  controllers: [SqlmenusController],
  exports: [SqlmenusService]
})
export class SqlmenusModule { }
