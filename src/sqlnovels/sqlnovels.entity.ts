import { Entity, Column, Index, PrimaryColumn, Timestamp } from 'typeorm';

@Entity()
@Index(["title", "author"], { unique: true })
export class novels {
  @PrimaryColumn()
  id: number;

  @Column({ length: 128 })
  title: string;

  @Column({ length: 255 })
  description: string;

  @Column({ length: 100 })
  author: string;

  // 封面
  @Column()
  thumb: string;

  // 插入失败的 page 章节名(index)
  @Column({ type: 'simple-array' })
  faildIndex: number[];

  // 分类，= types 表里的 id, types表里是复合主键，所以没法用一对一关系
  @Column()
  typeid: number;

  // 标签, https://typeorm.biunav.com/zh/entities.html#simple-array%E7%9A%84%E5%88%97%E7%B1%BB%E5%9E%8B
  @Column({ type: 'simple-array' })
  tags: number[];

  // 历史抓取来源，去除
  @Column('simple-array')
  from: string[];

  // 章节数
  @Column({ default: 0 })
  menusLen: number;

  // 是否全本，即写完了
  @Column({ default: false })
  isComplete: boolean;

  // 是全本且抓取完成
  @Column({ default: false })
  isSpiderComplete: boolean;

  // 访问数 @TODO: 访问量过高时是否可以把这个数据先缓存到redis隔一时间，比如1H才更新一次此数据
  @Index()
  @Column({ default: 0 })
  viewnum: number;

  @Column({ type: 'timestamp', default: () => 'current_timestamp' })
  ctime: Timestamp;

  @Column({
    type: 'timestamp',
    onUpdate: 'current_timestamp',
    default: () => 'current_timestamp',
  })
  updatetime: Timestamp;
}