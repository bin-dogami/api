import { Entity, Column, PrimaryColumn, Timestamp, OneToOne, JoinColumn, Index } from 'typeorm';

@Entity()
export class sqlpages {
  // 从menus 表里得到
  @PrimaryColumn()
  id: number;

  @Column()
  index: number;

  //  关联 novels 表
  @Column()
  novelId: number;

  // 来源
  @Column({ default: '' })
  from: string;

  // 目录名
  @Column({ length: 128 })
  mname: string;

  @Column("text")
  content: string;

  // 卷，有就有
  @Column({ length: 32, default: '' })
  volume: string;

  // 字数
  @Column()
  wordsnum: number;

  @Column({ type: 'timestamp', default: () => 'current_timestamp' })
  createtime: Timestamp;

  @Column({
    type: 'timestamp',
    onUpdate: 'current_timestamp',
    default: () => 'current_timestamp',
  })
  updatetime: Timestamp;
}