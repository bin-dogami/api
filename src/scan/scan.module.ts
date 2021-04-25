import { CacheModule, Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { SqlnovelsModule } from '../sqlnovels/sqlnovels.module';
import { SqltypesModule } from '../sqltypes/sqltypes.module';
import { SqlmenusModule } from '../sqlmenus/sqlmenus.module';
import { SqlpagesModule } from '../sqlpages/sqlpages.module';
import { SqlrecommendsModule } from '../sqlrecommends/sqlrecommends.module';
import { SqltypesdetailModule } from '../sqltypesdetail/sqltypesdetail.module';
import { SqlauthorsModule } from '../sqlauthors/sqlauthors.module';
import { SqlerrorsModule } from '../sqlerrors/sqlerrors.module';
import { SqlvisitorsModule } from '../sqlvisitors/sqlvisitors.module';

@Module({
  imports: [
    // https://docs.nestjs.cn/7/techniques?id=%e9%ab%98%e9%80%9f%e7%bc%93%e5%ad%98%ef%bc%88caching%ef%bc%89
    CacheModule.register({
      ttl: process.env.NODE_ENV === 'development' ? 10 : 60, //秒
      max: 20, //缓存中最大和最小数量
    }),
    SqlnovelsModule,
    SqltypesModule,
    SqlmenusModule,
    SqlpagesModule,
    SqlrecommendsModule,
    SqltypesdetailModule,
    SqlauthorsModule,
    SqlerrorsModule,
    SqlvisitorsModule
  ],
  providers: [ScanService],
  controllers: [ScanController]
})
export class ScanModule { }
