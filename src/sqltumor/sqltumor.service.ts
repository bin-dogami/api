import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sqltumor } from './sqltumor.entity';
import { CreateSqltumor } from "./create-sqltumor.dto";

export enum ITumor {
  JUST_REPLACE = 'just_replace',
  COMPLEX_REPLACE = 'complex_replace',
  ARRAY_REPLACE = 'array_replace',
}
export const TumorTypes = {
  [ITumor.JUST_REPLACE]: '直接替换',
  [ITumor.COMPLEX_REPLACE]: '汉词连续查找并替换',
  [ITumor.ARRAY_REPLACE]: '域名中以数组形式替换'  // www.xxxxxx.info，数据库里存的text 是 www,info
}

// @TODO: 缺少实际测试地方，忘了在哪来着
// @TODO: 抓取page内容时找到 域名 时中止抓取反馈给前端以便增加 tumor 数据
// 注意：text 可能是 string ，也可能是数组！
const complexReplace = (content: string, text: string | string[]) => {
  // ITumor.COMPLEX_REPLACE 和 ITumor.ARRAY_REPLACE 共用一个函数
  const isArrayReplace = Array.isArray(text)
  const wordsSpaceLen = isArrayReplace ? 20 : 4
  let _content = content
  const len = text.length
  // i 是 text index 指针
  let i = 0
  // 满足的 text 里的第一个词的 index，如果 text 以笔开头，但是 笔在 content 里有 两个，就需要一个一个确认，但只要有一个确认就替换
  let lastIndex = 0
  let willReplaceText = ''
  // 一次 while 循环里 willReplaceText 前进的 index 位置
  let currentIndex = 0
  while (i < len) {
    const isFirst = i === 0
    // @TODO: 直接相等的可以先判断处理一下
    const index = _content.indexOf(text[i], isFirst ? lastIndex : currentIndex)
    let next5HasSameFirstWord = false
    if (isFirst) {
      lastIndex = _content.indexOf(text[0], lastIndex + 1)
      next5HasSameFirstWord = text[1] !== text[0] && lastIndex > -1 && lastIndex - index < wordsSpaceLen
    }
    // 当前字所在
    if (next5HasSameFirstWord || (!isFirst && index - currentIndex > wordsSpaceLen - 1) || index === -1) {
      // 不满足条件
      willReplaceText = ''

      // text 第一个词这次不满足条件再 判断下一个是否满足条件，再重复 while 循环一次
      if (lastIndex > -1) {
        i = 0
        currentIndex = 0
        continue
      } else {
        break
      }
    } else {
      const len = isArrayReplace ? text[i].length : 1
      const subStr = _content.substr(isFirst ? index : currentIndex, isFirst ? text[i].length : index - currentIndex + len)
      willReplaceText += subStr
      currentIndex = index + len
    }

    i++
    // 最后一次循环，i 在上面已经+1了，所以下面的判断是没问题的
    if (i > len - 1) {
      // 遍历完成，已经知道是否要替换了
      if (willReplaceText.length) {
        _content = _content.replace(willReplaceText, '')
        // @TODO: 这里最多只替换一次，看是否有必要全部替换，出现两次的概率应该不高，不然代价有点大啊
        break
      }
    }
  }
  return _content
}

export const formula = (content: string, list: sqltumor[]) => {
  let _content = content
  while (list.length > 0) {
    const { type, text } = list.shift()

    if (type === ITumor.JUST_REPLACE) {
      _content = _content.replace(text, '')
    } else if (type === ITumor.COMPLEX_REPLACE) {
      if (!_content.includes(text[0])) {
        continue
      }
      _content = complexReplace(_content, text)
    } else if (type === ITumor.ARRAY_REPLACE) {
      const arr = text.split(',').map((w => w.trim())).filter(w => !!w)
      _content = complexReplace(_content, arr)
    }
  }
  return _content
}
// formula('12笔345678笔笔×趣×阁%%%%% 11111 &&&&&ｗｗｗ。ｂｉｑｕ33333333333ｇｅ。ｉｎｆｏ$$$$$$$笔趣阁', [{ type: ITumor.COMPLEX_REPLACE, text: '笔趣阁', host: '', id: 0 }, { type: ITumor.ARRAY_REPLACE, text: 'ｗｗｗ,ｉｎｆｏ', host: '', id: 0 }])

@Injectable()
export class SqltumorService {
  constructor(
    @InjectRepository(sqltumor)
    private readonly sqltumorRepository: Repository<sqltumor>,
  ) { }

  async create(createSqltumor: CreateSqltumor): Promise<sqltumor | string> {
    const oTumor = this.sqltumorRepository.create(createSqltumor);
    if (!Object.keys(TumorTypes).includes(oTumor.type)) {
      return '类型不对';
    }
    const one = await this.getOne(oTumor)
    if (one) {
      return '此数据已有';
    }
    return await this.sqltumorRepository.save(oTumor);
  }

  async getOne(oTumor: sqltumor): Promise<sqltumor> {
    const { type, text, host, } = oTumor
    return await this.sqltumorRepository.findOne({
      where: {
        type,
        text,
        host,
      }
    })
  }

  async findList(host: string): Promise<any[]> {
    const where = host ? { where: { host } } : {}
    return await this.sqltumorRepository.find({
      ...where,
      order: {
        id: 'DESC'
      },
      take: 100
    });
  }

  async remove(id: number): Promise<any> {
    return await this.sqltumorRepository.delete(id)
  }
}
