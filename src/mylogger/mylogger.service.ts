import { Injectable, Logger } from '@nestjs/common';
const dayjs = require('dayjs')
const fs = require('fs');
const path = require('path')
const logFilePath = './logs'
// 章节缺失错误日志文件名
const PageLose = '章节缺失错误'

@Injectable()
export class Mylogger extends Logger {
  private tmplLogs = '';
  private filePath = '';

  createPageLoseErrorLogFile() {
    return this.createErrorLogFile(PageLose)
  }
  createErrorLogFile(name = 'errors') {
    const logPath = path.resolve(logFilePath);
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath);
    }
    this.filePath = `${logPath}/${name}.log`;
    const stderr = fs.createWriteStream(this.filePath, {
      flags: 'a',
      encoding: 'utf8',
    });
    stderr.end();
    return this.filePath;
  }
  // 创建 logs 目录
  createLogFile(filePath?: string) {
    const logPath = path.resolve(logFilePath);
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath);
    }
    const fileName = dayjs().format('YYYY-MM-DD HH:mm') + '.log';
    this.filePath = filePath || `${logPath}/${fileName}`;
    const stderr = fs.createWriteStream(this.filePath, {
      flags: 'a',
      encoding: 'utf8',
    });
    stderr.end();
    return this.filePath;
  }
  // 写入日志
  writeLog() {
    const stderr = fs.createWriteStream(this.filePath, {
      flags: 'a',
      encoding: 'utf8',
    });
    // @TODO: 这里总有一次会写入失败，但tmplLogs数据又没丢，真奇怪
    stderr.on('error', err => this.log(`写入失败: ${err}`));
    stderr.write(this.tmplLogs);
    this.tmplLogs = '';
    stderr.end();
  }
  // 重命名文件名
  renameFileName(filePath, fn) {
    const newFilePath = fn(filePath);
    if (fs.existsSync(filePath)) {
      this.filePath = newFilePath;
      fs.renameSync(filePath, newFilePath);
    }
  }
  // 重命名文件名等特殊操作
  dealSpecialSituation(info?: any) {
    // 有书名在log文件名上加上书名
    if (info && info.bookname) {
      this.renameFileName(this.filePath, (p) => {
        if (p.includes(info.bookname)) {
          return p;
        }
        return p.replace(/\.log/, `[${info.bookname}].log`);
      })
    }
  }

  // 防止一次性写入太多日志内容
  start(message: string, filePath?: string) {
    this.log(message);
    return this.createLogFile(filePath);
  }
  end(message: string) {
    this.log(message);
    this.writeLog();
  }
  log(message: string, info?: any) {
    this.dealSpecialSituation(info);
    this.tmplLogs += message + '\n';
    if (this.tmplLogs.length > 1000) {
      this.writeLog();
    }
    super.log(message);
    // 抓取书信息和目录信息写同一个log文件里
    return this.filePath;
  }
  error(message: string) {
    super.error(message);
  }
  warn(message: string) {
    super.warn(message);
  }
  debug(message: string) {
    super.debug(message);
  }
  verbose(message: string) {
    super.verbose(message);
  }
}
