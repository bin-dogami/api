import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlerrors } from './sqlerrors.entity';
import { CreateSqlerrors } from "./create-sqlerrors.dto";

export enum IErrors {
  MENU_INSERT_FAILED = 'menu_insert_failed',
  MENU_INDEX_ABNORMAL = 'menu_insert_abnormal',
  PAGE_LOST = 'page_lost',
}
export const ErrorTypes = {
  // 除了目录index重复的目录插入失败
  [IErrors.MENU_INSERT_FAILED]: '目录插入失败',
  // 抓取到的目录的 index 已经有了（说明index 不对），需要人工修复
  // @TODO: 建一个后台人工处理这个问题
  [IErrors.MENU_INDEX_ABNORMAL]: '目录index异常',
  [IErrors.PAGE_LOST]: 'page缺失'
}

@Injectable()
export class SqlerrorsService {
  constructor(
    @InjectRepository(sqlerrors)
    private readonly sqlerrorsRepository: Repository<sqlerrors>,
  ) { }

  async create(createSqlerrors: CreateSqlerrors): Promise<sqlerrors> {
    const oError = this.sqlerrorsRepository.create(createSqlerrors);
    // 防止重复创建
    if (oError.type === IErrors.PAGE_LOST) {
      const res = await this.getPageLostErrors(oError)
      if (res.length) {
        return
      }
    } else if (oError.type === IErrors.MENU_INSERT_FAILED) {
      const res = await this.getMenuFailedErrors(oError)
      if (res.length) {
        return
      }
    }
    return await this.sqlerrorsRepository.save(oError);
  }

  async getPageLostErrors(oError: sqlerrors): Promise<any[]> {
    const { novelId, menuId } = oError
    return await this.sqlerrorsRepository.find({
      where: { novelId, menuId, type: IErrors.PAGE_LOST },
    })
  }

  async getMenuFailedErrors(oError: sqlerrors): Promise<any[]> {
    const { novelId, info } = oError
    return await this.sqlerrorsRepository.find({
      where: { novelId, info, type: IErrors.MENU_INSERT_FAILED },
    })
  }

  async getAllSqlerrorsByNovelId(novelId: number): Promise<any[]> {
    return await this.sqlerrorsRepository.find({
      select: ["id", "menuId", "menuIndex"],
      where: { novelId },
      order: {
        menuId: "ASC"
      }
    })
  }

  async getSqlerrorsByNovelId(novelId: number, skip?: number, size?: number): Promise<any[]> {
    return await this.sqlerrorsRepository.find({
      select: ["menuId", "menuIndex"],
      where: { novelId },
      order: {
        menuId: "ASC"
      },
      skip: skip || 0,
      take: size || 20,
    })
  }

  async getFailedPageList(): Promise<sqlerrors[]> {
    return await this.sqlerrorsRepository
      .createQueryBuilder()
      // 这里只能先查出最大的id和novelId，再查对应的 mname，必须两层嵌套查询
      .select("novelId", "id")
      .addSelect("count(*)", "count")
      .where("`type` = :type", { type: IErrors.PAGE_LOST })
      .groupBy("novelId")
      .execute()
  }

  async remove(id: number): Promise<void> {
    await this.sqlerrorsRepository.delete(id);
  }
}
