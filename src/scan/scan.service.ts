import { Injectable } from '@nestjs/common';

@Injectable()
export class ScanService {
  getBookList(): string {
    return 'Hello old bin';
  }
}
