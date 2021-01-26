import { Entity, Column, PrimaryGeneratedColumn, Index, OneToOne, JoinColumn } from 'typeorm';
// import { novels } from '../sqlnovels/sqlnovels.entity';
// import { types } from '../sqltypes/sqltypes.entity';

@Entity()
@Index(["tid", "novelId"], { unique: true })
export class typesdetail {
  @PrimaryGeneratedColumn()
  id: number;

  // books 表里 type 和 tags 共用一个字段
  @Index()
  @Column()
  tid: number;

  // 中文名
  @Column({ length: 32 })
  typename: string;

  // 是否是books里的 tags（标签），因为也可能是 type
  @Column()
  isTag: boolean;

  // 书id
  // @PrimaryColumn()
  // @OneToOne((type) => novels)
  // @JoinColumn({ name: "novelId" })
  @Index()
  @Column()
  novelId: number;
}