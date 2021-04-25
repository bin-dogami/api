import { getNovelId } from './../utils/index';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
// @NOTE: 也许还要加上 novelId 
@Index(["type", "key"], { unique: true })
export class sqldatahandler {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  novelId: number;

  @Index()
  @Column()
  type: string;

  // 不同的类型里这个 key 代表的字段可能不一样，比如目录id
  @Index()
  @Column()
  key: number;

  @Column()
  text: string;
}