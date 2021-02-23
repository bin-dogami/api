import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { AppController } from './app.controller';
import { GetbookModule } from './getbook/getbook.module';
import { FixdataModule } from './fixdata/fixdata.module';
import { ScanModule } from './scan/scan.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'novels$1024%123^LaoWang&2021',
      database: 'novels',
      // entities: [User],
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // autoLoadEntities: true,
      synchronize: true,
      // 开启缓存 https://typeorm.biunav.com/zh/caching.html
      // cache: {
      //   type: "database",
      //   tableName: "configs-novelstables-query-result-caches"
      // }
    }),
    GetbookModule,
    FixdataModule,
    ScanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private readonly connection: Connection) { }
}
