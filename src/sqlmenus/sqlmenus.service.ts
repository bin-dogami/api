import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { menus } from './sqlmenus.entity';
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
    return this.sqlmenusRepository.save(oMenus);
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

  async findLastIdByNovelId(novelId: number): Promise<any> {
    const menu = await this.findLastByNovelId(novelId);
    return menu && menu.id ? menu.id : getFirstMenuId();
  }

  async findAll(novelId: number): Promise<menus[]> {
    return this.sqlmenusRepository.find({
      where: { novelId }
    });
  }

  async findMenuByNovelIdAndIndex(novelId: number, index: number): Promise<menus> {
    return this.sqlmenusRepository.findOne({
      where: { novelId, index }
    });
  }

  async findCountByNovelId(novelId: number): Promise<number> {
    return this.sqlmenusRepository.count({
      where: { novelId }
    });
  }

  async findMenusByNovelId(novelId: number): Promise<menus[]> {
    return this.sqlmenusRepository.find({
      where: { novelId }
    });
  }

  async remove(id: string): Promise<void> {
    await this.sqlmenusRepository.delete(id);
  }
}
