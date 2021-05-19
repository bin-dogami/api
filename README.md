## Running the app
```bash
# development
$ yarn start:dev

# watch mode
$ yarn start

# production mode
$ npm run start:prod

# pm2 启动
pm2 start --name api ./dist/main.js
```

## Support
https://docs.nestjs.com/support

## 开发
crawler 抓取：https://github.com/bda-research/node-crawler#options-reference

### findOne 结果
findOne 如果找不到数据返回的是undefined

### 打印出查询语句
https://typeorm.biunav.com/zh/select-query-builder.html#%E8%8E%B7%E5%8F%96%E7%94%9F%E6%88%90%E7%9A%84sql%E6%9F%A5%E8%AF%A2%E8%AF%AD%E5%8F%A5
```
this.sqlmenusRepository.createQueryBuilder("menus").getSql()
```

### skip 字段
skip 不是第几页，而是第几个，比如要查第二页的，skip 就是 2 * size，从1开始

### A.service 文件里调用 B.service 文件
* B 模块需要在 B.module 的 exports 里写入 B.service
* A.module 里需要 imports 进来 B.module； 不需要在 app.module 里加啥
* 上两步完成后，A.service 里就可以引入 B.service 了，可以参考 sitemap 模块

### 引入问题
* A 引了 B，B就不要引 A 了，不然会有问题，可以建个 common 模块，把A和B 都要用的扔 common 里

### 定时任务
定时任务参考 sqlvisitors/sqlvisitors.service.ts

### 本地编译不报错但是服务起不来（不会出现编译成功时的一大堆router信息）原因分析
* 排查是不是mysql没起来
* 排查是不是没网了
* 排查mysql错误，比如 @Index() 和 @Column({ length: 32, unique: true }) 里的 unique 同时存在的时候
