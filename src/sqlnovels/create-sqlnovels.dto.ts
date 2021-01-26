export class CreateSqlnovels {
  id: number;
  title: string;
  description: string;
  author: string;
  typeid: number;
  thumb: string;
  faildIndex: number[];
  tags: number[];
  from: string[];
  viewnum?: number;
  menusLen?: number;
  isComplete?: boolean;
  isSpiderComplete?: boolean;
  // createtime: string;
  updatetime?: string;
}