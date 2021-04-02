import { Module } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { SitemapController } from './sitemap.controller';
import { SqltypesModule } from '../sqltypes/sqltypes.module';
import { SqlnovelsModule } from '../sqlnovels/sqlnovels.module';
import { SqlmenusModule } from '../sqlmenus/sqlmenus.module';
import { SqlrecommendsModule } from '../sqlrecommends/sqlrecommends.module';
import { SqlauthorsModule } from '../sqlauthors/sqlauthors.module';

@Module({
  imports: [SqltypesModule, SqlnovelsModule, SqlmenusModule, SqlrecommendsModule, SqlauthorsModule],
  providers: [SitemapService],
  controllers: [SitemapController],
  exports: [SitemapService],
})
export class SitemapModule { }
