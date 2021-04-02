import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Equal, LessThan, LessThanOrEqual, MoreThan, In, Not } from 'typeorm';
import { sqlmenus as menus } from './sqlmenus.entity';
import { CreateSqlmenus } from "./create-sqlmenus.dto";
import { getFirstMenuId, toClearTakeValue } from '../utils/index'

export enum IMenuErrors {
  MULTI_MENUS_IN_ONE_PAGE = 1,
}
export const ErrorTypes = {
  // 多个章节写到一个章节里了
  [IMenuErrors.MULTI_MENUS_IN_ONE_PAGE]: '目录插入失败',
}

@Injectable()
export class SqlmenusService {
  constructor(
    @InjectRepository(menus)
    private readonly sqlmenusRepository: Repository<menus>,
  ) { }

  async create(createSqlmenus: CreateSqlmenus): Promise<menus> {
    const oMenus = this.sqlmenusRepository.create(createSqlmenus);
    return this.sqlmenusRepository.save(oMenus)
  }

  // 根据novelId 查询每本书的最新一条目录
  async findLastMenuByNovelIds(novelIds: number[]): Promise<menus[]> {
    const _menus = await this.sqlmenusRepository
      .createQueryBuilder("menus")
      // 这里只能先查出最大的id和novelId，再查对应的 mname，必须两层嵌套查询
      .select("max(id)", "_id")
      // .addSelect("novelId")
      // .addSelect("mname")
      // .addSelect("`index`")
      .where("novelId IN (:...novelIds)", { novelIds })
      .andWhere("isOnline = :online", { online: true })
      .groupBy("novelId")
      .execute()
    // .getSql()

    // 写两次语句也避免 sql_mode=only_full_group_by 这个恶心的问题
    const ids = _menus.map(({ _id }) => _id)
    const menus = await this.getMenusByIds(ids)

    return menus
  }

  async getTotal(): Promise<number> {
    const data = await this.sqlmenusRepository
      .createQueryBuilder("menus")
      .select("count(*)", "total")
      .execute()
    return data.length && data[0] ? data[0].total : 0
  }

  // 获取最后take条目录
  async findLastMenusByNovelId(novelId: number, _take?: number): Promise<menus[]> {
    const take = _take === 100000 ? undefined : (_take || 1)
    return await this.sqlmenusRepository.find({
      where: { novelId },
      order: {
        id: "DESC"
      },
      take
    });
  }

  // 获取最后一条目录的id
  async findLastMenuId(): Promise<any> {
    const menu = await this.sqlmenusRepository.findOne({
      order: {
        id: "DESC"
      }
    });
    return menu && menu.id ? menu.id : getFirstMenuId();
  }

  // 获取书的目录，以分页的形式
  async getMenusByBookId(id: number, skip: number, size?: number, isDesc?: boolean, getAllFields?: boolean, getOnline?: number): Promise<[menus[], number]> {
    // getOnline 为0或不传时，不分上线不上线，为1时，只查上线的，为2时，只查不上线的
    const online: any = {}
    if (getOnline > 0) {
      online.isOnline = getOnline === 1
    }
    return await this.sqlmenusRepository.findAndCount({
      select: getAllFields ? undefined : ["id", "mname", "moriginalname", "index"],
      where: {
        novelId: id,
        ...online
      },
      order: {
        id: isDesc ? "DESC" : "ASC"
      },
      skip,
      take: size && size <= 100 ? size : 20,
    });
  }

  async getMenusByIds(ids: number[], getAllFields?: boolean): Promise<menus[]> {
    return await this.sqlmenusRepository.find({
      select: getAllFields ? undefined : ["id", "novelId", "index", "mname", "moriginalname", "from"],
      where: { id: In(ids) },
      order: {
        id: "ASC"
      },
    });
  }

  async getPrevMenus(id: number, novelId: number, take?: number, noEqual?: boolean): Promise<menus[]> {
    const prevMenus = await this.sqlmenusRepository.find({
      select: ["id", "mname", "moriginalname", "index"],
      where: {
        // 用个新奇的方式写
        novelId: Equal(novelId),
        id: noEqual ? LessThan(id) : LessThanOrEqual(id),
        isOnline: true
      },
      order: {
        id: "DESC"
      },
      take: take || 50
    })

    return prevMenus.reverse()
  }

  async getNextMenus(id: number, novelId: number, take?: number, getAllFields?: boolean, getOnline?: number): Promise<menus[]> {
    // getOnline 为0或不传时，不分上线不上线，为1时，只查上线的，为2时，只查不上线的
    const online: any = {}
    if (getOnline > 0) {
      online.isOnline = getOnline === 1
    }
    return await this.sqlmenusRepository.find({
      select: getAllFields ? undefined : ["id", "mname", "moriginalname", "index"],
      where: {
        novelId,
        id: MoreThan(id),
        ...online
      },
      order: {
        id: "ASC"
      },
      take: take === toClearTakeValue ? undefined : (take || 50)
    })
  }

  async getPrevNextMenus(id: number, novelId: number): Promise<menus[]> {
    const prevMenus = await this.getPrevMenus(id, novelId, 25)
    const nextMenus = await this.getNextMenus(id, novelId, 25, false, 1)
    return [...prevMenus, ...nextMenus]
  }

  // 根据一段日期之间的目录列表，online: {1: 全部, 2: 未上线, 3: 已上线}
  async getMenusByCreateDate(sDate: string, eDate: string, online: number, nIds: number[]): Promise<any> {
    const isOnline: boolean | boolean[] = online === 1 ? [true, false] : (online === 2 ? false : true)
    const onlineWhere = Array.isArray(isOnline) ? "IN (:...isOnline)" : "= :isOnline"

    return await this.sqlmenusRepository
      .createQueryBuilder("menus")
      .select("id")
      .addSelect("`index`")
      .addSelect("novelId")
      .addSelect("isOnline")
      .addSelect("ctime")
      .addSelect("moriginalname")
      .where("ctime >= :sDate", { sDate })
      .andWhere("ctime < :eDate", { eDate })
      .andWhere(`isOnline ${onlineWhere}`, { isOnline })
      // 不包含未上线的书目录
      .andWhere("novelId Not IN (:...nIds)", { nIds })
      // @TODO: index全为0 的加个标识吧
      // .andWhere("index > :index", { index: 0 })
      .orderBy("id", 'DESC')
      .limit(4000)
      .execute()
    // .getSql()
  }

  async findOne(id: number): Promise<menus> {
    return await this.sqlmenusRepository.findOne(id);
  }

  async findAll(novelId: number): Promise<menus[]> {
    return await this.sqlmenusRepository.find({
      where: { novelId }
    });
  }

  // @TODO: 用于测试
  async findAllMenus(): Promise<menus[]> {
    return await this.sqlmenusRepository.find({
      select: ["id"]
    });
  }

  // 获取一本书的总目录数
  async findCountByNovelId(novelId: number): Promise<number> {
    return await this.sqlmenusRepository.count({
      where: { novelId }
    });
  }

  async save(oMenus) {
    return await this.sqlmenusRepository.save(oMenus)
  }

  async remove(id: number) {
    return await this.sqlmenusRepository.delete(id);
  }

  async removeByNovelId(novelId: number): Promise<any> {
    return await this.sqlmenusRepository
      .createQueryBuilder()
      .delete()
      .where("novelId = :novelId", { novelId })
      .execute()
  }

  // 删除大于等于目录id的数据
  async batchDeleteGtMenus(id: number, novelId: number, notEq?: boolean): Promise<any> {
    const gtId = notEq ? 'id > :id' : 'id >= :id'
    return await this.sqlmenusRepository
      .createQueryBuilder()
      .delete()
      .where("novelId = :novelId", { novelId })
      .andWhere(gtId, { id })
      .execute()
  }

  // 批量设置目录上线且可访问
  async batchSetMenusOnline(ids: number[]): Promise<any> {
    return await this.sqlmenusRepository.createQueryBuilder()
      .update()
      .set({ isOnline: true })
      .where("id IN (:...ids)", { ids })
      .execute()
  }

  // 设置所有未上线的目录上线
  async setAllMenusOnline(): Promise<any> {
    return await this.sqlmenusRepository.createQueryBuilder()
      .update()
      .set({ isOnline: true })
      .where("isOnline = :online", { online: false })
      .execute()
  }

  // 指设置多本书的所有目录上线
  async batchSetMenusOnlineByNovels(novelIds: number[]): Promise<any> {
    return await this.sqlmenusRepository.createQueryBuilder()
      .update()
      .set({ isOnline: true })
      .where("novelId IN (:...novelIds)", { novelIds })
      .andWhere("isOnline = :online", { online: false })
      .execute()
  }

  // @NOTE: 给sitemap 用的
  async getMenusByNotInNovelIds(novelIds: number[], ctime: any) {
    return await this.sqlmenusRepository
      .createQueryBuilder("menus")
      .select("id")
      .addSelect("ctime")
      .andWhere(`ctime > :ctime`, { ctime })
      .andWhere(`isOnline = :isOnline`, { isOnline: true })
      .andWhere("novelId Not IN (:...novelIds)", { novelIds })
      .orderBy("id", 'DESC')
      .limit(30000)
      .execute()
  }

  // @NOTE: 给sitemap 用的
  async getLastTakeMenusByNovelId(id: number, take: number) {
    return await this.sqlmenusRepository.find({
      select: ["id", "ctime"],
      where: {
        novelId: id,
        isOnline: true,
      },
      order: {
        id: "DESC"
      },
      take
    });
  }
}
