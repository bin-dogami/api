import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Equal, LessThan, LessThanOrEqual, MoreThan, In } from 'typeorm';
import { sqlmenus as menus } from './sqlmenus.entity';
import { CreateSqlmenus } from "./create-sqlmenus.dto";
import { getFirstMenuId } from '../utils/index'

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
      .groupBy("novelId")
      .execute()
    // .getSql()

    // 写两次语句也避免 sql_mode=only_full_group_by 这个恶心的问题
    const ids = _menus.map(({ _id }) => _id)
    const menus = await this.getMenusByIds(ids)

    return menus
  }

  // 获取最小的 index
  async findLeastIndexByNovelId(novelId: number): Promise<any> {
    const menu = await this.sqlmenusRepository.findOne({
      where: { novelId },
      order: {
        index: "ASC"
      }
    });
    return menu ? menu.index : -1;
  }

  // 获取小于1000的最小的 index，大于1000 的是 index 有问题的（重复的index会转化为-1000以下）
  async findLeastLessThan1000IndexByNovelId(novelId: number): Promise<any> {
    const menu = await this.sqlmenusRepository.findOne({
      where: {
        novelId,
        index: LessThan(1000),
      },
      order: {
        index: "ASC"
      }
    });
    return menu ? menu.index : -1;
  }

  // 获取最新一条menu
  async findLastByNovelId(novelId: number): Promise<any> {
    return await this.sqlmenusRepository.findOne({
      where: { novelId },
      order: {
        id: "DESC"
      }
    });
  }

  // 获取最后take条目录
  async findLastMenusByNovelId(novelId: number, _take?: number): Promise<menus[]> {
    const take = _take || 1
    return await this.sqlmenusRepository.find({
      where: { novelId },
      order: {
        id: "DESC"
      },
      take
    });
  }

  // 弃
  async findLastIndexMenuByNovelId(novelId: number): Promise<menus> {
    return await this.sqlmenusRepository.findOne({
      where: { novelId },
      order: {
        index: "DESC"
      }
    });
  }

  // 获取最新一条目录的id
  async findLastIdByNovelId(novelId: number): Promise<any> {
    const menu = await this.findLastByNovelId(novelId);
    return menu && menu.id ? menu.id : getFirstMenuId();
  }

  // 获取书的目录，以分页的形式
  async getMenusByBookId(id: number, skip: number, size?: number, isDesc?: boolean): Promise<[menus[], number]> {
    return await this.sqlmenusRepository.findAndCount({
      select: ["id", "mname", "moriginalname", "index"],
      where: {
        novelId: id
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
      select: getAllFields ? undefined : ["id", "index", "mname", "moriginalname", "from"],
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
      },
      order: {
        id: "DESC"
      },
      take: take || 50
    })

    return prevMenus.reverse()
  }

  async getNextMenus(id: number, novelId: number, take?: number): Promise<menus[]> {
    return await this.sqlmenusRepository.find({
      select: ["id", "mname", "moriginalname", "index"],
      where: {
        novelId,
        id: MoreThan(id),
      },
      order: {
        id: "ASC"
      },
      take: take || 50
    })
  }

  async getPrevNextMenus(id: number, novelId: number): Promise<menus[]> {
    const prevMenus = await this.getPrevMenus(id, novelId, 25)
    const nextMenus = await this.getNextMenus(id, novelId, 25)
    return [...prevMenus, ...nextMenus]
  }

  // async findAll(novelId: number): Promise<menus[]> {
  //   return this.sqlmenusRepository.find({
  //     where: { novelId }
  //   });
  // }

  async findOne(id: number): Promise<menus> {
    return await this.sqlmenusRepository.findOne(id);
  }

  async findAll(novelId: number): Promise<menus[]> {
    return await this.sqlmenusRepository.find({
      select: ["id"],
      where: { novelId }
    });
  }

  async findMenuByNovelIdAndIndex(novelId: number, index: number): Promise<menus> {
    return await this.sqlmenusRepository.findOne({
      where: { novelId, index }
    });
  }

  // 获取一本书的总目录数
  async findCountByNovelId(novelId: number): Promise<number> {
    return await this.sqlmenusRepository.count({
      where: { novelId }
    });
  }

  // // @TODO: 仅用于 fixfrom，用后删掉吧
  // async getMenuByMoriginalname(novelId: number, moriginalname: string): Promise<any> {
  //   return await this.sqlmenusRepository.findOne({
  //     where: { novelId, moriginalname },
  //   });
  // }

  // // @TODO: 仅用于 fixfrom，用后删掉吧
  // async getMenuByFrom(novelId: number, from: string): Promise<any> {
  //   return await this.sqlmenusRepository.find({
  //     where: { novelId, from },
  //   });
  // }

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
}
