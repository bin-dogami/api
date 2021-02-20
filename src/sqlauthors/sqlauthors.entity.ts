import { Entity, Column, PrimaryGeneratedColumn, Index, OneToOne, JoinColumn } from 'typeorm';

@Entity()
export class sqlauthors {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  name: string;

  @Index()
  @Column()
  level: number;

  @Column()
  levelName: string;

  @Column()
  desc: string;

  // 书ids
  @Column({ type: 'simple-array' })
  novelIds: number[];
}