import { Entity, Column, PrimaryColumn, Index, Timestamp } from 'typeorm';

// 每次抓取前都更新一下所有数据的状态为 未抓取
@Entity()
export class sqlspider {
  // novelId
  @PrimaryColumn()
  id: number;

  // 状态: {0: 未抓取, 1: 已抓取完, 3: 抓取异常}，每次集体抓取前给状态 1 的设置为 0
  @Index()
  @Column()
  status: number;

  // 书所有的 index 都为 0 的
  @Index()
  @Column({ default: false })
  allIndexEq0: boolean;

  // 备注信息
  @Column()
  text: string;

  @Column({
    type: 'timestamp',
    onUpdate: 'current_timestamp',
    default: () => 'current_timestamp',
  })
  updatetime: Timestamp;

  // 是否忽略 index 的问题，忽略了index 重复就不会往 error 表里记录此书的 index 重复数据了，主要是title 太奇葩了，不好获取 index，就用moriginalname好了
  // @TODO: 洗一下数据，重复 index 问题处理一下
  @Column({ default: false })
  ignoreIndexRepeat: boolean;
}