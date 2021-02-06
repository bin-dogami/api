import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { SqlnovelsModule } from '../sqlnovels/sqlnovels.module';
import { SqltypesModule } from '../sqltypes/sqltypes.module';
import { SqlmenusModule } from '../sqlmenus/sqlmenus.module';
import { SqlpagesModule } from '../sqlpages/sqlpages.module';
import { SqltypesdetailModule } from '../sqltypesdetail/sqltypesdetail.module';

@Module({
  imports: [SqlnovelsModule, SqltypesModule, SqlmenusModule, SqlpagesModule, SqltypesdetailModule],
  providers: [ScanService],
  controllers: [ScanController]
})
export class ScanModule { }
