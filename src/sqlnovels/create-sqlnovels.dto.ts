export class CreateSqlnovels {
  id: number;
  title: string;
  otitle: string;
  seotitle?: string;
  description: string;
  authorId: number;
  author: string;
  typeid: number;
  typename: string;
  thumb: string;
  tags: number[];
  from: string[];
  isOnline: boolean;
  viewnum?: number;
  // volumeLen?: number;
  menusLen?: number;
  isComplete?: boolean;
  isSpiderComplete?: boolean;
  // createtime: string;
  updatetime?: string;
}