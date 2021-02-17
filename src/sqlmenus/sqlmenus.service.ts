import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Equal, LessThan, LessThanOrEqual, MoreThan, In } from 'typeorm';
import { sqlmenus as menus } from './sqlmenus.entity';
import { CreateSqlmenus } from "./create-sqlmenus.dto";
import { getFirstMenuId } from '../utils/index'

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
    const menus = await this.sqlmenusRepository.find({
      select: ["novelId", "id", "mname", "index"],
      where: { id: In(_menus.map(({ _id }) => _id)) },
    })

    return menus
  }

  // 获取最新 index，id 不一定随着 index 变大而变大，因为有可能前面的某个 id 失败了，然后重新抓取了一次，那这个数据就可能 index 不大，但 id 是最大的
  async findLastIndexByNovelId(novelId: number): Promise<any> {
    const menu = await this.sqlmenusRepository.findOne({
      where: { novelId },
      order: {
        index: "DESC"
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

  // 获取最新一条目录的id
  async findLastIdByNovelId(novelId: number): Promise<any> {
    const menu = await this.findLastByNovelId(novelId);
    return menu && menu.id ? menu.id : getFirstMenuId();
  }

  // 获取书的目录，以分页的形式
  async getMenusByBookId(id: number, skip: number, size?: number, isDesc?: boolean): Promise<[menus[], number]> {
    return await this.sqlmenusRepository.findAndCount({
      select: ["id", "mname", "index"],
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

  async getPrevMenus(id: number, novelId: number, take?: number, noEqual?: boolean): Promise<menus[]> {
    const prevMenus = await this.sqlmenusRepository.find({
      select: ["id", "mname", "index"],
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
      select: ["id", "mname", "index"],
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
    return this.sqlmenusRepository.findOne(id);
  }

  async findMenuByNovelIdAndIndex(novelId: number, index: number): Promise<menus> {
    return this.sqlmenusRepository.findOne({
      where: { novelId, index }
    });
  }

  // 获取一本书的总目录数
  async findCountByNovelId(novelId: number): Promise<number> {
    return this.sqlmenusRepository.count({
      where: { novelId }
    });
  }

  async remove(id: string): Promise<void> {
    await this.sqlmenusRepository.delete(id);
  }
}
