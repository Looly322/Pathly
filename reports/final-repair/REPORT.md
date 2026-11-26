# Pathly 恢复版最终修复验收（2026-11-26）

项目：`/Users/conths/Documents/ChatGPT/Pathly-final-recovery`。原恢复备份未改动；本轮起点标签 `repair-start-20261126`。没有修改规划算法、历史记录、收藏或公共缓存。

## 实际结果

- **高德配置通过真实验证**：项目使用 JavaScript API 2.0 及其地点插件。采用同源 `/_AMapService`、Python 安全代理，加载 SDK 前设置 serviceHost。Security Code 只在忽略且权限600的后端本地环境文件内。直接 Web Service 请求返回 `USERKEY_PLAT_NOMATCH`，说明不能将此 JS Key 当作 Web Service Key；JS 插件实测成功，无须为当前功能另购服务。[官方安全代理说明](https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode)。
- **国内搜索通过**：北京、上海、广州解析中文城市和坐标；故宫博物院、上海迪士尼乐园、北京饭店、和平饭店、广州酒家每项返回10个真实候选。浏览器显示高德地图画布及北京行程，见 `amap-cases.json`、`beijing-map.png`。
- **国外图片5/5通过实际解码及Vue图片组件展示**：埃菲尔铁塔、卢浮宫、大英博物馆、浅草寺、自由女神像。保留原来源、作者、许可。强制重新查询耗时约4.0–6.5秒；已有公共缓存保留，因此不是严格冷缓存对照，也不声称已完成全局图片性能量化。见 `photos.json`、`foreign-photos.png`。
- **图片链路修复**：原代理在读取有效本地图片字节前检查过期URL索引，导致本来可用的图片返回404；现先使用有效字节缓存，仍遵守原TTL。前端忽略已卸载旧图片的错误事件，同一地点最多一次自动重新获取，保留用户重试入口。缓存问题有自动化回归；未将模拟失败测试冒充上游403/429真实故障验收。
- **首页图片34/34加载**：从历史命令恢复遗漏的7张原图；荔枝图恢复为原 Pexels 页对应的正确CDN文件名。没有换成其他内容，没有改变排版。见 `home.json`、`destinations.png`。原荔枝来源：https://www.pexels.com/photo/bunch-of-lychee-fruits-46518/ 。
- **兰亭交互已验证**：恢复版已有原始 SearchCalligraphy 组件与透明书法素材，本轮确认图片加载、固定背景、径向遮罩、鼠标显现/离开淡出、输入操作、移动端和减少动画设置。没有重新生成书法或替换为字体。见 `calligraphy-test.log`、`calligraphy.png`。
- **鼠标效果范围**：历史中查到鼠标揭示书法和摄影墙视差，已验证（摄影墙位移约123px）。未找到独立圆环/圆点光标的原始实现，因此没有擅自添加不同效果。此项不能宣称独立自定义光标已恢复。
- **导航、刷新**：真实点击历史记录与返回首页3轮后刷新，书法仅一层并继续响应；无 pageerror。Paris、London、Tokyo真实搜索正常。见 `navigation.json`。初次自动化在页面入场/滚动动画未稳定时点击落到header，增加等待稳定后通过，未因此改动业务代码。
- **响应式**：390px移动视口无横向溢出；触屏不强制启用鼠标书法。

## 测试

129项JavaScript测试通过、44项Python测试通过、生产构建通过。浏览器使用真实Chrome/Playwright，图片不是仅检查URL。相关测试及截图位于本目录。第三方网络、配额、地域和域名权限仍可能影响其他地点，不据这5张样本保证全球全部图片。生产部署需保持安全代理可达并按高德控制台配置实际域名。

## 修改文件

- `.env.example`、`vite.config.js`：安全代理示例和开发转发。
- `src/services/amapService.js`：serviceHost初始化，不向前端注入安全密钥。
- `backend/amap_proxy.py`、`backend/server.py`：固定上游、安全凭据注入、超时和脱敏错误。
- `backend/test_amap_proxy.py`：代理约束测试。
- `backend/media_delivery.py`、`backend/test_media_delivery.py`：有效字节缓存优先及回归测试。
- `src/components/ActivityImage.vue`：过期图片事件防护、有限重取。
- `public/images/home/credits.json`与8张恢复WebP：原始素材和署名恢复。
- `recovery/*-live.mjs`、`amap-cases.mjs`、`home-final.mjs`、`navigation-final.mjs`、`photo-component-proof.mjs`、`restore-missing-home.py`：可追溯验收/恢复脚本。

本地私有配置 `.env.local`、`backend/.env` 不纳入版本记录，报告与构建不包含安全密钥。
