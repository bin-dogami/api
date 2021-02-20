import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class sqlerrors {
  @PrimaryGeneratedColumn()
  id: number;

  // type 值为 ./utils 里ErrorTypes key
  @Index()
  @Column()
  type: string;

  @Index()
  @Column()
  menuId: number;

  // 可能没有
  @Index()
  @Column({ default: 0 })
  menuIndex: number;

  @Index()
  @Column()
  novelId: number;

  // 错误说明
  @Column({ default: '' })
  info: string;
}