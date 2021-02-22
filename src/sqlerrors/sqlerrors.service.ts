import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlerrors } from './sqlerrors.entity';
import { CreateSqlerrors } from "./create-sqlerrors.dto";

export enum IErrors {
  MENU_INSERT_FAILED = 'menu_insert_failed',
  PAGE_LOST = 'page_lost',
}
export const ErrorTypes = {
  [IErrors.MENU_INSERT_FAILED]: '目录插入失败',
  [IErrors.PAGE_LOST]: 'page缺失'
}

@Injectable()
export class SqlerrorsService {
  constructor(
    @InjectRepository(sqlerrors)
    private readonly sqlerrorsRepository: Repository<sqlerrors>,
  ) { }

  create(createSqlerrors: CreateSqlerrors): Promise<sqlerrors> {
    const oError = this.sqlerrorsRepository.create(createSqlerrors);
    return this.sqlerrorsRepository.save(oError);
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
      // @TODO: 这里应该是 IErrors.PAGE_LOST
      .where("`type` = :type", { type: "menu_insert_failed" })
      .groupBy("novelId")
      .execute()
  }

  async remove(id: number): Promise<void> {
    await this.sqlerrorsRepository.delete(id);
  }
}
