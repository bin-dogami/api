import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
// 标签表，只是避免查所有标签时 查 typesdetail 里的数据会慢
export class sqltypes {
  // books 表里 type 和 tags 共用一个字段
  // 与 bid 组合成复合主键
  @PrimaryGeneratedColumn()
  id: number;

  // 中文名
  @Index({ unique: true })
  @Column({ length: 32 })
  name: string;

  // 是否是books里的 tags（标签），因为也可能是 type
  @Column()
  isTag: boolean;
}