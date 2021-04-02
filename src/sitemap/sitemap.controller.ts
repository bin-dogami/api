import { Controller } from '@nestjs/common';
import { SitemapService } from './sitemap.service';

import { Mylogger } from '../mylogger/mylogger.service';

@Controller('sitemap')
export class SitemapController {
  private readonly logger = new Mylogger(SitemapController.name);

  constructor(
    private readonly sitemapService: SitemapService,
  ) { }

}
