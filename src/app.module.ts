import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { AppController } from './app.controller';
import { GetbookModule } from './getbook/getbook.module';
import { FixdataModule } from './fixdata/fixdata.module';
import { Fixdata2Module } from './fixdata2/fixdata2.module';
import { ScanModule } from './scan/scan.module';
import { ScheduleService } from './schedule/schedule.service';
import { MyloggerModule } from './mylogger/mylogger.module';
import { SitemapModule } from './sitemap/sitemap.module';

@Module({
  imports: [
    // 定时任务
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'novels$1024%123^LaoWang&2021',
      database: 'novels',
      // utf8mb4 支持emuji 表情，utf8 插入表情会报错
      charset: 'utf8mb4_unicode_ci',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // autoLoadEntities: true,
      synchronize: true,
      // 开启缓存 https://typeorm.biunav.com/zh/caching.html
      // cache: {
      //   type: "database",
      //   tableName: "configs-novelstables-query-result-caches"
      // }
    }),
    // 要在一个 service 里调用另一个 service 类，需要在这里引入一下 Module
    MyloggerModule,
    SitemapModule,
    GetbookModule,
    FixdataModule,
    Fixdata2Module,
    ScanModule,
  ],
  controllers: [AppController],
  providers: [AppService, ScheduleService],
})
export class AppModule {
  constructor(private readonly connection: Connection) { }
}
