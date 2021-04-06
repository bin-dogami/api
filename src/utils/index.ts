const dayjs = require('dayjs')
const fs = require('fs');
const download = require('download');

export const toClearTakeValue = 100000

const getRandom = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min
}

export const getFirstNovelId = () => {
  return getRandom(12345, 34567);
}

export const getNovelId = (id: number) => {
  return id + getRandom(1, 100);
}

export const getFirstMenuId = () => {
  return getRandom(123456, 345678);
}

// 一次性要抓取的章节多的跨度大，isNew 其实没啥意义
export const getMenuId = (id: number, isNew?: boolean) => {
  return id + getRandom(10, isNew ? 500 : 300);
}

// 可能是这样： 004失去记忆的自己是个食人魔？（http://localhost:3010/book/23084）
export const getValidTitle = (title: string) => {
  if (title.includes('章')) {
    return title.replace(/.*章\s*/, '').trim()
  }
  return title.trim().replace(/^(\d+)/, '')
}

// 获取域名，带 http 或 https 的
export const getHostFromUrl = (url: string) => {
  return url.replace(/(?<=(https?:\/\/)[^\/]+)\/.*/, '')
}

// 获取域名，不带 http
export const getHost = (url: string) => {
  const _url = getHostFromUrl(url)
  return _url.replace(/https?:\/\//, '')
}

export const ImagePath = '../web-static/'

export const downloadImage = async (path: string, url: string, id: number) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }

  const urlSplitArr = url.split('.');
  const imageType = urlSplitArr.length ? urlSplitArr[urlSplitArr.length - 1] : 'jpg';
  const filePath = `${path}/${id}.${imageType}`;
  fs.writeFileSync(filePath, await download(url));
  return filePath;
}

export const writeImage = async (path: string, imageBuffer: any, imageName: string, id?: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }

  const urlSplitArr = imageName.split('.');
  const imageType = urlSplitArr.length ? urlSplitArr[urlSplitArr.length - 1] : 'jpg';
  // 先创建一个时间戳的图片，到时候再重命名
  const filePath = `${path}/${id || dayjs().format('YYYYMMDDHHmmss')}.${imageType}`;
  fs.writeFileSync(filePath, imageBuffer);
  return filePath;
}

export const unique = (arr: number[]) => {
  return Array.from(new Set(arr));
}

export const isNumber = (num: any) => {
  if (typeof num === 'number') {
    return true
  }
  return typeof num === 'string' && /^\d+$/.test(num)
}
