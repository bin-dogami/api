import { Entity, Column, PrimaryColumn, Timestamp, OneToOne, JoinColumn, Index, Generated } from 'typeorm';

@Entity()
// index 可以重复，重复的记一下就行了，这样重复的 index 和没有 index 的也不用费劲去弄 负值了
// @Index(["novelId", "index"], { unique: true })
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

  // 创建目录时设置为false, 先不上线，等确认没啥问题了再上;  同时，也是方便把这一批新抓取的目录提交百度收录（方便查询）
  @Index()
  @Column({ default: true })
  isOnline: boolean;

  // 卷，有就有
  @Column({ length: 16, default: '' })
  volume: string;

  // 来源
  @Column({ default: '' })
  from: string;

  // 错误类型
  @Column({ default: 0 })
  ErrorType: number;

  // 字数
  // @Column({ default: 0 })
  // wordsnum: number;

  @Column({ type: 'timestamp', default: () => 'current_timestamp' })
  ctime: Timestamp;
}