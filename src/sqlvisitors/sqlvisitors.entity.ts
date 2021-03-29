import { Entity, Column, Timestamp, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class sqlvisitors {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 128 })
  host: string;

  // 蜘蛛 sogou|so|haosou|baidu|google|youdao|yahoo|bing|gougou|118114|vnet|360|ioage|sm|sp 等
  @Index()
  @Column({ length: 100 })
  spider: string;

  @Index()
  @Column({ length: 256 })
  referer: string;

  // 浏览设备
  @Column({ length: 1024 })
  useragent: string;

  // 浏览器版本？
  @Column({ length: 256 })
  secchua: string;

  // 这个不知道
  @Column({ length: 256 })
  secchuamobile: string;

  // 整个 headers 信息，上面的字段都是这个字段中的值
  @Column({ length: 3072 })
  headers: string;

  @Column({ type: 'timestamp', default: () => 'current_timestamp' })
  ctime: Timestamp;
}