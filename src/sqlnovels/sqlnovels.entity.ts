import { Entity, Column, Index, PrimaryColumn, Timestamp } from 'typeorm';

@Entity()
@Index(["title", "author"], { unique: true })
export class sqlnovels {
  @PrimaryColumn()
  id: number;

  // 前端展示的 title
  @Column({ length: 128 })
  title: string;

  // 抓取的原title
  @Column({ length: 128 })
  otitle: string;

  // 页面的title中的补充部分，上面的title+seotitle = 页面中的title
  @Column({ length: 128, default: '' })
  seotitle: string;

  @Column({ length: 1000 })
  description: string;

  @Column({ length: 100 })
  author: string;

  @Column()
  authorId: number;

  // 封面
  @Column()
  thumb: string;

  // 分类，= types 表里的 id, types表里是复合主键，所以没法用一对一关系
  @Index()
  @Column()
  typeid: number;

  @Column({ length: 32 })
  typename: string;

  // 标签, https://typeorm.biunav.com/zh/entities.html#simple-array%E7%9A%84%E5%88%97%E7%B1%BB%E5%9E%8B
  @Column({ type: 'simple-array' })
  tags: number[];

  // 历史抓取来源，去除
  @Column('simple-array')
  from: string[];

  // 卷数，没啥意义，有空再加吧
  // @Column({ default: 0 })
  // volumeLen: number;

  // 章节数
  @Column({ default: 0 })
  menusLen: number;

  // 创建一本书时，初始化是false, 先不上线，等抓完了且确定没啥问题了再上;  同时，也是方便把这一批新抓取的书提交百度收录（方便查询）
  @Index()
  @Column({ default: true })
  isOnline: boolean;

  // 是否全本，即写完了
  @Index()
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
    // 只要有update，onUpdate 就会触发
    // onUpdate: 'current_timestamp',
    default: () => 'current_timestamp',
  })
  updatetime: Timestamp;
}