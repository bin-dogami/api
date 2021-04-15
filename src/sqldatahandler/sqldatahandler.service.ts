import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqldatahandler } from './sqldatahandler.entity';
import { CreateSqldatahandler } from "./create-sqldatahandler.dto";

export enum IDataHandler {
  PAGE_INVALID = '1',
}
export const DataHandlerTypes = {
  // 内容就一小部分，然后提示  正在手打中，请稍等片刻，内容更新后，请重新刷新页面，即可获取最新更新！
  // 每次重新验证这个type时从最后一个目录ID 开始就行，目录id 写到 key 里
  [IDataHandler.PAGE_INVALID]: 'page内容无效，正在手打中',
}

@Injectable()
export class SqldatahandlerService {
  constructor(
    @InjectRepository(sqldatahandler)
    private readonly sqldatahandlerRepository: Repository<sqldatahandler>,
  ) { }

  async create(createSqldatahandler: CreateSqldatahandler): Promise<sqldatahandler | string> {
    const oData = this.sqldatahandlerRepository.create(createSqldatahandler);
    return await this.sqldatahandlerRepository.save(oData);
  }

  async findLastInvalidPageId(): Promise<number> {
    const data = await this.sqldatahandlerRepository.findOne({
      where: {
        type: IDataHandler.PAGE_INVALID
      },
      order: {
        key: 'DESC'
      }
    })
    return data ? data.key : 0
  }

  async remove(id: number): Promise<any> {
    return await this.sqldatahandlerRepository.delete(id)
  }
}
