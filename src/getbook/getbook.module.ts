import { Module } from '@nestjs/common';
import { GetBookService } from './getBook.service';
import { GetBookController } from './getBook.controller';
import { SqlnovelsModule } from '../sqlnovels/sqlnovels.module';
import { SqltypesModule } from '../sqltypes/sqltypes.module';
import { SqlmenusModule } from '../sqlmenus/sqlmenus.module';
import { SqlpagesModule } from '../sqlpages/sqlpages.module';
import { SqlrecommendsModule } from '../sqlrecommends/sqlrecommends.module';
import { SqltypesdetailModule } from '../sqltypesdetail/sqltypesdetail.module';

@Module({
  imports: [SqlnovelsModule, SqltypesModule, SqlmenusModule, SqlpagesModule, SqlrecommendsModule, SqltypesdetailModule],
  providers: [GetBookService],
  controllers: [GetBookController]
})
export class GetbookModule { }
