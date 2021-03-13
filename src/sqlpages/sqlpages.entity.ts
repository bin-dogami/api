import { Entity, Column, PrimaryColumn, Timestamp, OneToOne, JoinColumn, Index } from 'typeorm';
@Entity()
export class sqlpages {
  // 从menus 表里得到
  @PrimaryColumn()
  id: number;

  // content内容装不下时，做分页处理， nextId 为下一分页的 id，新创建了分页page 并不会创建新的menu，还是对应原来的
  @Column({ default: 0 })
  nextId: number;

  @Column()
  index: number;

  //  关联 novels 表
  @Column()
  novelId: number;

  // 来源 @TODO: 没必要有
  @Column({ default: '' })
  from: string;

  // 目录名
  @Column({ length: 128 })
  mname: string;

  @Column({ type: "text", charset: 'utf8mb4' })
  content: string;

  // 卷，有就有， @TODO: 没必要有
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