import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class sqltumor {
  @PrimaryGeneratedColumn()
  id: number;

  // type 值为 ./service 里ErrorTypes key
  @Index()
  @Column()
  type: string;

  @Index()
  @Column()
  text: string;

  @Index()
  @Column()
  host: string;

  @Index()
  @Column({ default: false })
  useFix: boolean;
}