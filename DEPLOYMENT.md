# Pathly 搜索服务部署

本地访问：双击 `start.command`，或在项目根目录执行 `npm run dev`，打开 http://localhost:5173/。该命令同时启动 Vite 和 Python 后端。

## 为什么上传前端后搜索失效

城市、OpenTripMap 景点、图片资料和天气依赖 `/api/*`。`vite.config.js` 中的 localhost 代理只在本机 dev/preview 生效。单独上传 dist 不包含运行中的 Python 服务。

## Vercel

部署整个仓库根目录，不能只上传 dist。采用 Vite preset；Build Command `npm run build`；Output Directory `dist`。新增 `api/pathly.py` 复用现有后端，`vercel.json` 将 `/api/*` 转发至 Python Function。

在 Vercel 项目的 Environment Variables 中配置：

- `OPEN_TRIP_MAP_API_KEY`：复制本机 backend/.env 对应值，仅服务端使用。
- `VITE_AMAP_KEY`、`VITE_AMAP_SECURITY_CODE`：现有高德 Web JS 凭据，复制本机 .env.local 对应值；核对高德控制台允许域名是否包含线上域名。这是原有客户端 SDK 配置，不能将服务端 OpenTripMap Key 改成 VITE_ 开头。

设置 Production/Preview 所需环境后重新部署。`.env` 不提交、不上传。无需配置 Foursquare。

验收：`https://你的域名/api/health` 应返回 JSON `{"ok":true}`；`/api/destinations/search?q=Paris` 应返回 destinations 数组，不能是 HTML。再在页面搜索城市并生成行程。

缓存：Vercel 使用可写 `/tmp/pathly-cache`，本机继续 backend/.cache。云函数实例之间不共享缓存与本地请求计数，因此计数不是账户全局额度保障；上游免费额度仍以官方账户为准。未增加收费 API；Vercel 自身用量受账户套餐限制。

参考：https://vercel.com/docs/functions/runtimes/python/api-directory

本次本地测试通过不代表线上已更新。须重新部署后再验证该域名；没有访问 Vercel 项目配置与部署日志时不能声称线上已修复。
