import { Entity, Column, PrimaryColumn, Timestamp, OneToOne, JoinColumn, Index, Generated } from 'typeorm';
// import { novels } from '../sqlnovels/sqlnovels.entity';

@Entity()
@Index(["novelId", "index"], { unique: true })
export class sqlmenus {
  @PrimaryColumn()
  id: number;

  // 目录名，去掉第XX章后
  @Column({ length: 128 })
  mname: string;

  // 目录名，从书章节页抓取过来时的名称，抓取下一章时好对比以便知道到哪一章了
  @Column({ length: 128 })
  moriginalname: string;

  // 第 XXX （阿拉伯数字） 章
  // @TODO: index 可能为 负数，所以输出的时候负数一律不输出 第XX章(显示 moriginalname 吧)
  // select id, `index`, mname from menus;
  @Index()
  @Column()
  index: number;

  @Index()
  // @OneToOne((type) => novels)
  // @JoinColumn({ name: "novelId" })
  @Column()
  novelId: number;

  // 卷，有就有
  @Column({ length: 16, default: '' })
  volume: string;

  // 来源
  @Column({ default: '' })
  from: string;

  // 字数
  // @Column({ default: 0 })
  // wordsnum: number;

  @Column({ type: 'timestamp', default: () => 'current_timestamp' })
  ctime: Timestamp;
}