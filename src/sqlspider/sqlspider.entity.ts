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

  // 状态为 3 时，text 里写入数据
  @Column()
  text: string;

  @Column({
    type: 'timestamp',
    onUpdate: 'current_timestamp',
    default: () => 'current_timestamp',
  })
  updatetime: Timestamp;
}