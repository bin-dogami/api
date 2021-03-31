import { Module } from '@nestjs/common';
import { Mylogger } from './mylogger.service';

@Module({
  providers: [Mylogger],
  exports: [Mylogger],
})
export class MyloggerModule { }
