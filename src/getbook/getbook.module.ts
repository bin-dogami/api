import { Module } from '@nestjs/common';
import { GetBookService } from './getbook.service';
import { GetBookController } from './getbook.controller';
import { SqlnovelsModule } from '../sqlnovels/sqlnovels.module';
import { SqltypesModule } from '../sqltypes/sqltypes.module';
import { SqlmenusModule } from '../sqlmenus/sqlmenus.module';
import { SqlpagesModule } from '../sqlpages/sqlpages.module';
import { SqlrecommendsModule } from '../sqlrecommends/sqlrecommends.module';
import { SqltypesdetailModule } from '../sqltypesdetail/sqltypesdetail.module';
import { SqlauthorsModule } from '../sqlauthors/sqlauthors.module';
import { SqlerrorsModule } from '../sqlerrors/sqlerrors.module';
import { SqltumorModule } from '../sqltumor/sqltumor.module';
import { SqlspiderModule } from '../sqlspider/sqlspider.module';

@Module({
  imports: [SqlnovelsModule, SqltypesModule, SqlmenusModule, SqlpagesModule, SqlrecommendsModule, SqltypesdetailModule, SqlauthorsModule, SqlerrorsModule, SqltumorModule, SqlspiderModule],
  providers: [GetBookService],
  controllers: [GetBookController]
})
export class GetbookModule { }
