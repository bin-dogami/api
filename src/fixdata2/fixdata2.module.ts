import { Module } from '@nestjs/common';
import { Fixdata2Service } from './fixdata2.service';
import { Fixdata2Controller } from './fixdata2.controller';
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
import { SqlvisitorsModule } from '../sqlvisitors/sqlvisitors.module';
import { SqldatahandlerModule } from '../sqldatahandler/sqldatahandler.module';
import { SqlhostspiderstructorModule } from '../sqlhostspiderstructor/sqlhostspiderstructor.module';
import { SitemapModule } from '../sitemap/sitemap.module';
import { GetbookModule } from '../getbook/getbook.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule, GetbookModule, SqlnovelsModule, SqltypesModule, SqlmenusModule, SqlpagesModule, SqlrecommendsModule, SqltypesdetailModule, SqlauthorsModule, SqlerrorsModule, SqltumorModule, SqlspiderModule, SqlvisitorsModule, SitemapModule, SqldatahandlerModule, SqlhostspiderstructorModule],
  providers: [Fixdata2Service],
  controllers: [Fixdata2Controller],
})
export class Fixdata2Module { }
