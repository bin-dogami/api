import { Controller } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

import { Mylogger } from '../mylogger/mylogger.service';

@Controller('schedule')
export class ScheduleController {
  private readonly logger = new Mylogger(ScheduleController.name);

  constructor(
    private readonly scheduleService: ScheduleService,
  ) { }

}
