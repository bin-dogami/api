// 请求成功 response 数据格式统一设置
import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
interface Response<T> {
  data: T;
}
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, T | Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | Response<T>> {
    // https://docs.nestjs.cn/7/exceptionfilters?id=arguments-host
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    console.log(request.url)

    return next.handle().pipe(
      map(data => {
        // 网站建设中～ 做特殊处理
        if (request.url === '/') {
          return data
        };

        return {
          data,
          code: 0,
          message: '请求成功',
        };
      }),
    );
  }
}