import { Entity, Column, PrimaryColumn, Timestamp, OneToOne, JoinColumn, Index, Generated } from 'typeorm';

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