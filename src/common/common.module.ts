import { Module } from '@nestjs/common';
import { SqlnovelsModule } from '../sqlnovels/sqlnovels.module';
import { SqlmenusModule } from '../sqlmenus/sqlmenus.module';
import { CommonService } from './common.service';
import { CommonController } from './common.controller';

@Module({
  imports: [SqlnovelsModule, SqlmenusModule],
  providers: [CommonService],
  controllers: [CommonController],
  exports: [CommonService]
})
export class CommonModule { }
