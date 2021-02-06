import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class sqlrecommends {
  @PrimaryGeneratedColumn()
  index: number;

  // 推荐级别，越大推荐优先级越高
  @Column()
  level: number;

  // id 就是 novels 的 id
  @Index({ unique: true })
  @Column()
  id: number;

  @Column({ length: 128 })
  title: string;

  @Column({ length: 100 })
  author: string;

  @Column({ length: 1000 })
  description: string;

  @Column()
  thumb: string;
}