## Running the app
```bash
# development
$ yarn start:dev

# watch mode
$ yarn start

# production mode
$ npm run start:prod
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