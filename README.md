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
### 打印出查询语句
https://typeorm.biunav.com/zh/select-query-builder.html#%E8%8E%B7%E5%8F%96%E7%94%9F%E6%88%90%E7%9A%84sql%E6%9F%A5%E8%AF%A2%E8%AF%AD%E5%8F%A5
```
this.sqlmenusRepository.createQueryBuilder("menus").getSql()
```