import { Entity, Column, Timestamp, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class sqlvisitors {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 128 })
  host: string;

  @Column({ length: 512 })
  url: string;

  // 蜘蛛 sogou|so|haosou|baidu|google|youdao|yahoo|bing|gougou|118114|vnet|360|ioage|sm|sp 等
  @Index()
  @Column()
  spider: string;

  @Column()
  ip: string;

  @Column({ length: 255 })
  referer: string;

  // 浏览设备
  @Column({ length: 512 })
  use_agent: string;

  // 真实IP（列表，使用了代理就会有好几个IP）
  @Column({ length: 512 })
  http_x_forwarded_for: string;

  // 请求状态，200 等
  @Column()
  status: number;

  // 请求的主体长度（response 大小）
  @Column()
  bytes: number;

  // 页面访问需要验证时的字段这个字段伪装一下吧
  @Column({ length: 255 })
  user: string;

  // 便于搜索
  @Index()
  @Column()
  cDate: string;

  // 访问时间
  @Column()
  ctime: string;
}