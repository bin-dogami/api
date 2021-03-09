import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Mylogger } from './mylogger/mylogger.service';
// https://www.it610.com/article/1297154876907790336.htm
import { TransformInterceptor } from './interceptor/transform.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  app.useLogger(new Mylogger());
  // 允许跨域
  process.env.NODE_ENV === 'development' && app.enableCors();
  // 处理response数据
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3001);
}
bootstrap();
