# 太阳系模拟

具有未来观测台视觉的交互式三维太阳系：八大行星与冥王星、26 颗天然卫星、10 个著名人类航天器、小行星带、真实星历驱动的行星位置与时间机器（1950–2050），支持严格真实比例模式与可调的中文参数控制台。位置与时间来自打包的 JPL 公开数据，用于模型展示，不代表实时测量。

## 功能

- **真实星历**：行星角位置全时段采用 JPL「Approximate Positions of the Major Planets」开普勒根数 + 世纪变率（1800–2050 有效，误差远小于屏幕像素）；默认艺术化模式仅压缩径向距离，行星方位与真实天空一致
- **严格真实比例模式**：一键切换，半径与轨道共用同一 km→场景映射，无任何体积放大（太阳半径约为地球轨道的 1/215）；航天器也按公开资料中的最大展开跨度（米）换算，十字环仅为独立的屏幕空间定位 UI，不代表实体体积
- **时间机器（1950–2050）**：时间可倒流（倒放按钮）、日期弹窗直接跳转任意日期、「今天」按钮同步真实当前日期；旅行者 2 号与新视野号的航天器档案内可直接选择任务节点，模型回溯后自动暂停在事件当天
- **四个深空探测器真实轨迹**：旅行者 1/2 号、先驱者 10 号、新视野号全部使用打包 JPL Horizons 状态矢量（30 天采样 + 三次 Hermite 插值），覆盖发射日至 2050 年；每个航天器及轨迹仅在其真实发射日期后出现，覆盖范围外钳制端点，绝不外推；艺术化距离压缩采用连续斜率曲线，不引入非物理折角
- **NASA 官方 3D 模型**：旅行者、先驱者 10 号、新视野号、朱诺、帕克、韦伯、哈勃、国际空间站使用 NASA 3D Resources 官方 GLB（档案预览可拖拽旋转，艺术化场景内聚焦时同步显示）；真实比例场景按公开展开尺寸渲染实体、以独立定位环保证可发现性；模型无自发光补光，加载失败自动回退程序化模型；天宫无官方模型，保留程序化模型并在档案注明
- **目标搜索**：目标列表支持中英文模糊搜索，桌面端按 `/` 直达
- **实时读数**：档案面板按当前模型时刻实时计算距太阳/距地球（AU + km）与单向光时（NASA Eyes 风格）
- **URL 深链**：`#target=jupiter&date=1986-01-24&scale=true` 直接分享定位，加载时自动应用
- 基于 NASA 测绘数据的真实行星贴图（2K），含地球云层与土星环实拍条带；离线时自动回退到程序化贴图
- 4K 真实银河全景天幕（ESO，按银道面真实倾角摆放）叠加程序化星野；背景启用深度遮挡，不会穿透太阳或天体表面
- 太阳、八大行星、冥王星与 26 颗天然卫星：月球、火卫一/二、木卫一至五、土卫一/二/三/四/五/六/八、天卫一/二/三/四/五、海卫一（逆行）/八、冥卫一至五
- 火星与木星之间约 2600 颗实例化小行星
- 底部主控台 + 独立次级面板：目标列表 / 目标档案 / 任务故事 / 模拟参数，互不干扰
- 点击目标即自动锁定跟随，镜头平滑飞近（Star Walk 式观测）
- 暂停 / 播放，时间倍率 0.01x–1000x；快捷键：空格暂停、R 重置相机、/ 搜索、Esc 关闭面板
- 真实贴图可一键切换为轻量程序化贴图，兼顾低配设备
- 沉浸、观测、纯净三套场景预设，支持黄道网格、航天器开关与自动巡航；真实比例下物理滑杆自动锁定为 1×
- 桌面观测台与移动端抽屉自适应布局，全部界面支持纯中文 / 双语切换

## 环境

- Node.js 20+
- 包管理器：npm

## 安装与运行

```bash
npm install
npm run dev
```

开发服务器固定监听 **4317** 端口：

[http://localhost:4317](http://localhost:4317)

生产构建：

```bash
npm run build
npm run preview
```

## Docker 一键部署

需要本机已安装 Docker（含 compose 插件）：

```bash
docker compose up -d --build
```

构建完成后访问 [http://localhost:4317](http://localhost:4317)。镜像为两阶段构建（Node 22 编译 + Nginx 静态托管），自带 gzip、静态资源缓存策略与健康检查；`restart: unless-stopped` 保证宿主机重启后自动拉起。

不使用 compose 的等价命令：

```bash
docker build -t solar-system-sim .
docker run -d --name solar-system-sim -p 4317:80 --restart unless-stopped solar-system-sim
```

更换端口：把 `docker-compose.yml` 中的 `4317:80` 改为 `<你的端口>:80`。

## 操作

| 操作 | 说明 |
| --- | --- |
| 拖动 | 旋转视角 |
| 滚轮 / 捏合 | 缩放 |
| 单击行星 / 卫星 / 航天器 | 打开档案并锁定跟随 |
| 底部「目标 / 档案 / 参数」按钮 | 打开或收起对应次级面板 |
| 沉浸模式按钮 | 隐藏全部界面只留星空，Esc 或右下角按钮退出 |
| 档案面板「上一个 / 下一个」或 ← → 方向键 | 顺序浏览全部目标 |
| 参数面板「真实比例」开关 | 切换风格化布局与严格真实比例布局 |
| 时间滑块 | 0.01x–1000x，1x 约等于「1 秒推进 1 地球日」；倒放按钮让时间回溯 |
| 底部日期按钮 | 时间机器：跳转任意日期（1950–2050）、回到今天或 2026 起点 |
| 空格 / R / `/` / Esc | 暂停播放 / 重置相机 / 搜索目标 / 关闭面板 |
| URL 井号参数 | `#target=<id>&date=<YYYY-MM-DD>&scale=true` 深链定位 |
| 跟随 | 相机目标锁定当前天体 |
| 重置相机 | 回到总览并取消跟随 |

## 技术栈

Vite + React + TypeScript、@react-three/fiber、@react-three/drei、@react-three/postprocessing、Tailwind CSS、shadcn/ui 风格组件。

## 开发辅助

无头截图验证（复用 Playwright 缓存的 Chromium，先启动 dev 服务器）：

```bash
node scripts/capture.mjs out.png "click:目标" "wait:2000"
# 深链场景直接截图：
CAPTURE_URL='http://localhost:4317/#target=earth&scale=true' node scripts/capture.mjs truescale.png wait:4000
```

### 行星星历（JPL Approximate Positions）

`src/data/ephemeris.ts` 内置 JPL《Keplerian Elements for Approximate Positions of the Major Planets》Table 1 的九组根数与世纪变率（E.M. Standish，1800–2050 有效期），运行时解开普勒方程得到 J2000 黄道日心坐标。经典行星最坏黄经误差远小于 1 角分，冥王星约 0.1°——均低于本模拟任一比例下的单像素。来源：<https://ssd.jpl.nasa.gov/planets/approx_pos.html>。

### JPL Horizons 离线轨迹包

浏览器不会请求 Horizons。`src/data/horizonsTrajectories.ts` 是已打包的太阳中心、几何（未作光行时/像差修正）、ICRF 参考平面/参考系、TDB、AU/AU·day⁻¹ VECTORS 数据，30 天间隔：

| 探测器 | COMMAND | 覆盖（TDB） |
| --- | --- | --- |
| 旅行者 1 号 | `-31` | 1977-09-08 至 2051-01-13 |
| 旅行者 2 号 | `-32` | 1977-08-21 至 2051-01-11 |
| 先驱者 10 号 | `-23` | 1972-03-04 至 2049-12-24 |
| 新视野号 | `-98` | 2006-01-20 至 2049-12-30 |

精确 API 查询、原始响应 SHA-256 和采样范围记录于 `src/data/horizons-provenance.json`。

场景在相邻样本间用位置 + 速度做三次 Hermite 插值（飞掠弧段仍然平滑），渲染时转入 J2000 黄道坐标；风格化模式仅为显示压缩径向距离，真实比例模式按 AU 直映射（超过 192 AU 的星际探测器钳制显示半径，其余天体严格同比例）。覆盖范围以外钳制在端点，绝不静默外推。它们是 30 天采样的可视化轨迹，不应作为导航、近距离飞掠或实时运营用途。重新抓取（需要网络）、离线完整性检查与星历数值校验：

```bash
node scripts/fetch-horizons-trajectories.mjs
node scripts/validate-horizons-trajectories.mjs
npx esbuild scripts/validate-ephemeris.ts --bundle --format=esm --platform=node --outfile=.tmp-validate.mjs && node .tmp-validate.mjs && rm .tmp-validate.mjs
```

## 素材来源

- 航天器 3D 模型：[NASA 3D Resources](https://science.nasa.gov/3d-resources/)（旅行者、先驱者 10 号、新视野号、朱诺、帕克太阳探测器、韦伯、哈勃、国际空间站官方 GLB，存放于 `public/models/`）。依 NASA 媒体使用条款署名；本项目与 NASA 无隶属关系，NASA 亦未对本项目背书。天宫空间站无官方模型，使用程序化模型
- 行星星历：[JPL Approximate Positions of the Major Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)；深空探测器轨迹：[JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)
- 太阳、水星、金星、地球（含云层）、火星、木星贴图：[Solar System Scope Textures](https://www.solarsystemscope.com/textures/)（CC BY 4.0，基于 NASA 测绘数据）
- 土星、天王星、海王星、冥王星、土星环贴图：threex.planets（源自 Planet Pixel Emporium）
- 月球贴图：three.js 官方示例资源
- 银河全景天幕：[ESO / S. Brunier — The Milky Way panorama](https://www.eso.org/public/images/eso0932a/)（CC BY 4.0）
- 所有贴图均存放于 `public/textures/`，加载失败时自动回退到程序化生成贴图
