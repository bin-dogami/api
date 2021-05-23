import { Entity, Column, Timestamp, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class sqlhostspiderstructor {
  @PrimaryGeneratedColumn()
  id: number;

  // @Index()  // @NOTE: 不能同时出现  Index 和  unique？不然编译不报错但是其实服务没起来
  @Column({ length: 32, unique: true })
  host: string;

  @Column({ length: 120 })
  title: string;

  @Column({ length: 120 })
  description: string;

  @Column({ length: 120 })
  author: string;

  @Column({ length: 120 })
  thumb: string;

  @Column({ length: 120 })
  type: string;

  @Column({ length: 120 })
  menus: string;

  @Column({ length: 120 })
  mname: string;

  @Column({ length: 120 })
  content: string;

  @Column({ length: 120 })
  navs: string;

  @Column({ length: 120 })
  bookUrlRule: string;

  @Column({ type: 'timestamp', default: () => 'current_timestamp' })
  ctime: Timestamp;
}