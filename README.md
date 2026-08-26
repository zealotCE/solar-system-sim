# 太阳系模拟

具有未来观测台视觉的交互式三维太阳系：八大行星与冥王星、26 颗天然卫星、10 个著名人类航天器、小行星带、焦点椭圆轨道，支持比例参考模式与可调的中文参数控制台。位置与时间均用于模型展示，不代表实时测量。

## 功能

- **真实比例模式**：一键切换，行星轨道距离按 AU 参考；天体为保持可见而放大，太阳与航天器存在显示例外
- 基于 NASA 测绘数据的真实行星贴图（2K），含地球云层与土星环实拍条带；离线时自动回退到程序化贴图
- 天体档案内置可拖拽的实时 3D 预览（航天器为程序化 3D 模型）
- 4K 真实银河全景天幕（ESO，按银道面真实倾角摆放）叠加程序化星野
- 太阳、八大行星、冥王星与 26 颗天然卫星：月球、火卫一/二、木卫一至五、土卫一/二/三/四/五/六/八、天卫一/二/三/四/五、海卫一（逆行）/八、冥卫一至五
- 10 个人类航天器位置参考：旅行者 2 号与新视野号使用内置 JPL Horizons 笛卡尔轨迹；其余航天器（包括旅行者 1 号、先驱者 10 号）为代表性轨道或示意位置，并非实时位置
- 旅行者 2 号与新视野号的完整任务轨迹线来自打包样本；旅行者 1 号与先驱者 10 号保留示意历史路线
- 火星与木星之间约 2600 颗实例化小行星
- 基于开普勒方程的焦点椭圆轨道与近日点变速
- 底部主控台 + 三个独立次级面板：目标列表 / 目标档案 / 模拟参数，互不干扰
- 点击目标查看直径、公转/自转周期、轨道半径或任务距离、信号延迟与简报
- 点击目标即自动锁定跟随，镜头平滑飞近（Star Walk 式观测）
- 暂停 / 播放，时间倍率 0.01x–1000x；快捷键：空格暂停、R 重置相机、Esc 关闭面板
- 真实贴图可一键切换为轻量程序化贴图，兼顾低配设备
- 天体尺寸、轨道跨度、偏心率、倾角、星野和辉光均可实时调节
- 沉浸、观测、纯净三套场景预设，支持黄道网格、航天器开关与自动巡航
- 桌面观测台与移动端抽屉自适应布局

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
| 参数面板「真实比例」开关 | 切换风格化布局与真实比例布局 |
| 时间滑块 | 0.01x–1000x，1x 约等于「1 秒推进 1 地球日」；模型日历从 2026 年起算 |
| 空格 / R / Esc | 暂停播放 / 重置相机 / 关闭面板 |
| 跟随 | 相机目标锁定当前天体 |
| 重置相机 | 回到总览并取消跟随 |

## 技术栈

Vite + React + TypeScript、@react-three/fiber、@react-three/drei、@react-three/postprocessing、Tailwind CSS、shadcn/ui 风格组件。

## 开发辅助

无头截图验证（复用 Playwright 缓存的 Chromium，先启动 dev 服务器）：

```bash
node scripts/capture.mjs out.png "click:目标" "wait:2000"
```

### JPL Horizons 离线轨迹包

浏览器不会请求 Horizons。`src/data/horizonsTrajectories.ts` 是已打包的太阳中心、几何（未作光行时/像差修正）、ICRF 参考平面/参考系、TDB、AU/AU·day⁻¹ VECTORS 数据：旅行者 2（`COMMAND='-32'`）覆盖 **1977-08-21 至 2030-12-29 TDB**，新视野号（`COMMAND='-98'`）覆盖 **2006-01-20 至 2030-12-28 TDB**，均为 30 天间隔。精确 API 查询、原始响应 SHA-256 和采样范围记录于 `src/data/horizons-provenance.json`。

场景在相邻样本间作笛卡尔线性插值，然后仅为显示压缩径向距离；轨迹线直接连接原始样本，不使用曲线拟合。覆盖范围以外会钳制在端点，绝不静默外推。它们是 30 天采样的可视化轨迹，不应作为导航、近距离飞掠或实时运营用途。重新抓取（需要网络）及离线完整性检查：

```bash
node scripts/fetch-horizons-trajectories.mjs
node scripts/validate-horizons-trajectories.mjs
```

## 素材来源

- 太阳、水星、金星、地球（含云层）、火星、木星贴图：[Solar System Scope Textures](https://www.solarsystemscope.com/textures/)（CC BY 4.0，基于 NASA 测绘数据）
- 土星、天王星、海王星、冥王星、土星环贴图：threex.planets（源自 Planet Pixel Emporium）
- 月球贴图：three.js 官方示例资源
- 银河全景天幕：[ESO / S. Brunier — The Milky Way panorama](https://www.eso.org/public/images/eso0932a/)（CC BY 4.0）
- 所有贴图均存放于 `public/textures/`，加载失败时自动回退到程序化生成贴图
