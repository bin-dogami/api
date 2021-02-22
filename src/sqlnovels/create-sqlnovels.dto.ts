export class CreateSqlnovels {
  id: number;
  title: string;
  description: string;
  authorId: number;
  author: string;
  typeid: number;
  typename: string;
  thumb: string;
  tags: number[];
  from: string[];
  viewnum?: number;
  menusLen?: number;
  isComplete?: boolean;
  isSpiderComplete?: boolean;
  // createtime: string;
  updatetime?: string;
}