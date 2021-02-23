import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class sqltumor {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  text: string;

  @Index()
  @Column()
  host: string;
}