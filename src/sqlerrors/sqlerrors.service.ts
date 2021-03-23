import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqlerrors } from './sqlerrors.entity';
import { CreateSqlerrors } from "./create-sqlerrors.dto";

export enum IErrors {
  MENU_INSERT_FAILED = 'menu_insert_failed',
  // @TODO: 这个应该是废弃了，有空删掉
  MENU_INDEX_ABNORMAL = 'menu_insert_abnormal',
  CANNOT_FIND_LAST_MENU = 'cannot_find_last_menu',
  LAST3_MENUS_INDEX_EQ0 = 'last_3menus_index_eq0',
  PAGE_LOST = 'page_lost',
}
export const ErrorTypes = {
  // 除了目录index重复的目录插入失败
  [IErrors.MENU_INSERT_FAILED]: '目录插入失败',
  // 抓取到的目录的 index 重复问题（原网站有这个问题），需要人工修复
  [IErrors.MENU_INDEX_ABNORMAL]: '目录index异常',
  [IErrors.CANNOT_FIND_LAST_MENU]: '找不到上一次抓取的最后章节',
  [IErrors.LAST3_MENUS_INDEX_EQ0]: '上一次抓取的最后3章index都是0',
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
    if (oError.type === IErrors.MENU_INSERT_FAILED) {
      const res = await this.getMenuInsertFailedErrors(oError)
      if (res.length) {
        return
      }
    } else if (oError.type === IErrors.PAGE_LOST) {
      const res = await this.getPageLostErrors(oError)
      if (res.length) {
        return
      }
    } else if (oError.type === IErrors.CANNOT_FIND_LAST_MENU) {
      const res = await this.getMenuFailedErrors(oError)
      if (res.length) {
        return
      }
    } else if (oError.type === IErrors.LAST3_MENUS_INDEX_EQ0) {
      const res = await this.getLast3IndexEq0Errors(oError)
      if (res.length) {
        return
      }
    }
    return await this.sqlerrorsRepository.save(oError);
  }

  async getLast3IndexEq0Errors(oError: any): Promise<any[]> {
    const { novelId } = oError
    return await this.sqlerrorsRepository.find({
      where: { novelId, type: IErrors.LAST3_MENUS_INDEX_EQ0 },
    })
  }

  async getMenuInsertFailedErrors(oError: any): Promise<any[]> {
    const { novelId, menuId } = oError
    return await this.sqlerrorsRepository.find({
      where: { novelId, menuId, type: IErrors.MENU_INSERT_FAILED },
    })
  }

  async getPageLostErrors(oError: any): Promise<any[]> {
    const { novelId, menuId } = oError
    return await this.sqlerrorsRepository.find({
      where: { novelId, menuId, type: IErrors.PAGE_LOST },
    })
  }

  async getMenuFailedErrors(oError: any): Promise<any[]> {
    const { menuId } = oError
    return await this.sqlerrorsRepository.find({
      where: { menuId, type: IErrors.CANNOT_FIND_LAST_MENU },
    })
  }

  async getAllPageLostByNovelId(novelId: number): Promise<any[]> {
    return await this.sqlerrorsRepository.find({
      select: ["id", "menuId", "menuIndex"],
      where: { novelId, type: IErrors.PAGE_LOST },
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

  // 抓取失败的目录的pagelist
  async getFailedPageList(): Promise<sqlerrors[]> {
    return await this.sqlerrorsRepository
      .createQueryBuilder()
      .select("novelId", "id")
      .addSelect("count(*)", "count")
      .where("`type` = :type", { type: IErrors.PAGE_LOST })
      .groupBy("novelId")
      .execute()
  }

  // 上一次抓取的最后的目录这次抓取不到了
  async getErrorsByType(type: string): Promise<sqlerrors[]> {
    return await this.sqlerrorsRepository
      .createQueryBuilder()
      .select("*")
      .where("`type` = :type", { type })
      .execute()
  }

  // 获取抓取到的index是重复的目录对应的书ID列表
  async getRepeatedMenuBooks(): Promise<sqlerrors[]> {
    return await this.sqlerrorsRepository
      .createQueryBuilder()
      .select("novelId", "id")
      .addSelect("count(*)", "count")
      .where("`type` = :type", { type: IErrors.MENU_INDEX_ABNORMAL })
      .groupBy("novelId")
      .execute()
  }

  // 获取抓取到的index是重复的目录列表
  async getRepeatedMenuIdsByNovelId(novelId: number): Promise<sqlerrors[]> {
    return await this.sqlerrorsRepository.find({
      select: ["id", "menuId", "menuIndex", "info"],
      where: { novelId, type: IErrors.MENU_INDEX_ABNORMAL },
    })
  }

  async remove(id: number): Promise<any> {
    return await this.sqlerrorsRepository.delete(id);
  }

  // 删除书id相关的信息
  async removeByNovelId(novelId: number): Promise<any> {
    return await this.sqlerrorsRepository
      .createQueryBuilder()
      .delete()
      .where("novelId = :novelId", { novelId })
      .execute()
  }

  // 删除目录id相关的信息
  async removeByMenuId(menuId: number): Promise<any> {
    return await this.sqlerrorsRepository
      .createQueryBuilder()
      .delete()
      .where("menuId = :menuId", { menuId })
      .execute()
  }

  // 删除大于等于目录id的数据
  async batchDeleteGtMenus(menuId: number, novelId: number): Promise<any> {
    return await this.sqlerrorsRepository
      .createQueryBuilder()
      .delete()
      .where("novelId = :novelId", { novelId })
      .andWhere('menuId >= :menuId', { menuId })
      .execute()
  }
}
