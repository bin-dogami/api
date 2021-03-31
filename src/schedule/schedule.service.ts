import { Injectable } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { Mylogger } from '../mylogger/mylogger.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Mylogger(ScheduleService.name);

  getBookList(): string {
    return 'Hello world';
  }

  // @Cron('5 * * * * *')
  // handleCron() {
  //   console.log(1111)
  // }

  // 10000 为毫秒
  // @Interval(10000)
  // handleInterval() {
  //   console.log(2222)
  // }
}
