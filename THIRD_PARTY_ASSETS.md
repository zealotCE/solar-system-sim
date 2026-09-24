# 第三方素材台账 · Third-Party Asset Ledger

本台账逐文件记录随站点分发或运行时加载的第三方素材，用于商业化前的合规核查。它是工程侧记录，不构成法律意见。背景与发布门槛见 [商业化与素材合规](docs/商业化与素材合规.md) / [Commercialization and asset compliance](docs/commercialization-and-asset-compliance.md)。

- 项目自有代码的许可证尚未确定（仓库暂无 `LICENSE`），由所有者决定；无论最终选择何种许可证，都不覆盖本表所列第三方素材。
- 标记为 **待核实** 的字段表示仓库内没有可靠记录，不作推测；商业上线前应补齐原始下载 URL、下载日期和处理流程。
- 标记为 **⚠ 需处理** 的条目在商业化前必须替换或取得书面许可。
- 署名同时在应用内各目标档案中显示（来源见 `src/lib/spacecraftModels.ts`、`src/lib/minorBodyModels.ts`）。

## 许可条款速查

| 代号 | 条款 |
| --- | --- |
| NASA-Media | [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)：一般不受美国版权保护，可用于信息/教育用途；须注明来源，不得暗示 NASA 背书，NASA 标志与第三方署名内容另行核查 |
| PDS | NASA Planetary Data System 科学数据：公开使用，须引用数据集 DOI 及产品标签 `CITATION_DESC`，并说明修改 |
| CC-BY-4.0 | [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)：署名、链接许可证、说明修改 |
| PPE | Planet Pixel Emporium 条款：允许在实时模拟器中作为渲染资源使用，但限制把原始贴图作为素材包再分发（具体商业条款 **待核实**） |
| OFL-1.1 | [SIL Open Font License 1.1](https://openfontlicense.org/) |

## 3D 模型 · `public/models/`

| 本地路径 | 目标 | 来源 | 许可 / 条款 | 修改 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `public/models/voyager.glb` | 旅行者 1/2 号（共用） | [NASA 3D Resources](https://science.nasa.gov/3d-resources/) · Voyager Probe (B) | NASA-Media | 待核实 | 原始文件 URL、下载日期待核实 |
| `public/models/pioneer10.glb` | 先驱者 10 号 | NASA 3D Resources · Pioneer 10 | NASA-Media | 待核实 | 同上 |
| `public/models/newhorizons.glb` | 新视野号 | NASA 3D Resources · New Horizons | NASA-Media | 待核实 | 同上 |
| `public/models/juno.glb` | 朱诺号 | NASA 3D Resources · Juno (B) | NASA-Media | 待核实 | 同上 |
| `public/models/parker.glb` | 帕克太阳探测器 | NASA 3D Resources · Parker Solar Probe | NASA-Media | 待核实 | 同上 |
| `public/models/jwst.glb` | 詹姆斯·韦伯空间望远镜 | NASA 3D Resources · James Webb Space Telescope (B) | NASA-Media | 待核实 | 同上 |
| `public/models/hubble.glb` | 哈勃空间望远镜 | NASA 3D Resources · Hubble Space Telescope (A) | NASA-Media | 待核实 | 同上 |
| `public/models/iss.glb` | 国际空间站 | NASA 3D Resources · ISS (B) | NASA-Media | 待核实 | 同上 |
| `public/models/cassini.glb` | 卡西尼-惠更斯 | [NASA 3D Resources · Cassini-Huygens (B)](https://science.nasa.gov/3d-resources/cassini-huygens-b/) | NASA-Media | 待核实 | 下载日期待核实 |
| `public/models/galileo.glb` | 伽利略号 | [NASA 3D Resources · Galileo](https://science.nasa.gov/3d-resources/galileo/) | NASA-Media | 待核实 | 同上 |
| `public/models/dawn.glb` | 黎明号 | [NASA 3D Resources · Dawn](https://science.nasa.gov/3d-resources/dawn/) | NASA-Media | 待核实 | 同上 |
| `public/models/rosetta.glb` | 罗塞塔号 | [NASA 3D Resources · Rosetta](https://science.nasa.gov/3d-resources/rosetta/) | NASA-Media；ESA 任务，ESA 权利 **待核实** | 待核实 | 同上 |
| `public/models/osiris-rex.glb` | OSIRIS-REx | [NASA 3D Resources · OSIRIS-REx](https://science.nasa.gov/3d-resources/origins-spectral-interpretation-resource-identification-and-security-regolith-explorer-osiris-rex/) | NASA-Media | 待核实 | 同上 |
| `public/models/europa-clipper-meshopt.glb` | 欧罗巴快船 | [NASA · Europa Clipper downloadable 3D model](https://science.nasa.gov/missions/europa-clipper/europa-clipper-resources/europa-clipper-downloadable-3d-model/) | NASA-Media | Meshopt 几何压缩 + WebP 纹理的网页优化衍生文件（原始文件超过 Cloudflare Pages 25 MiB 上限）；处理参数待核实 | 下载日期待核实 |
| `public/models/roman.glb` | 南希·格雷斯·罗曼空间望远镜 | [NASA · Building Roman](https://science.nasa.gov/missions/roman-space-telescope/building-roman/)（源 `RST_Model_V004.glb`，SHA-256 固化在脚本中） | NASA-Media | 几何减面、Meshopt、WebP、1K 纹理；可由 `npm run optimize:model:roman` 复现 | 已记录 |
| `public/models/ceres.glb` | 谷神星 | [NASA VTAD · Ceres 3D Model](https://science.nasa.gov/resource/ceres-3d-model/) | NASA-Media | 待核实 | 下载日期待核实 |
| `public/models/vesta.glb` | 灶神星 | [NASA VTAD · Vesta 3D Model](https://science.nasa.gov/resource/vesta-3d-model/) | NASA-Media | 待核实 | 同上 |
| `public/models/bennu.glb` | 贝努 | [NASA 3D Resources · 1999 RQ36](https://science.nasa.gov/3d-resources/1999-rq36-asteroid/) | NASA-Media | 待核实 | 同上 |
| `public/models/67p.glb` | 67P/丘留莫夫-格拉西缅科 | [ESA / Rosetta · 67P Shape Models v2.0](https://doi.org/10.26007/34vg-8s07)（PDS） | PDS；ESA 数据条款 **待核实** | 由科学形状网格转换为紧凑 GLB；减面/转换参数待核实 | `CITATION_DESC` 待补录 |
| `public/models/apophis.glb` | 阿波菲斯 | [NASA PDS · JPL Apophis Radar Shape Model v1.0](https://sbnarchive.psi.edu/pds4/non_mission/gbo.ast-apophis.jpl.radar.shape_model_v1.0/) | PDS | 由科学形状网格转换为紧凑 GLB；参数待核实 | `CITATION_DESC` 待补录 |
| `public/models/arrokoth.glb` | 阿罗科斯 | [NASA PDS · Porter (2024) Arrokoth Shape Model](https://doi.org/10.26007/97r3-1e19) | PDS | 由科学形状网格转换为紧凑 GLB；参数待核实 | `CITATION_DESC` 待补录 |
| `public/models/tiangong.glb` | 天宫空间站（T 字构型） | 项目自建，参考 [CMSA 公开构型资料](https://www.cmse.gov.cn/dmt/tj/sz15/202302/t20230221_52741.html) | 项目自有（随代码许可证） | 由 `npm run generate:model:tiangong` 程序化生成 | 须标注“非官方工程 CAD”，不得使用机构标志 |
| `public/models/tiangong-cross.glb` | 天宫空间站（规划十字构型） | 项目自建，参考[新华社报道](https://english.news.cn/20260623/6b7214cefeb147bea229e5a4820309b4/c.html) | 项目自有（随代码许可证） | 同上 | 同上；为规划情景，非在轨实体 |

## 贴图 · `public/textures/`

| 本地路径 | 用途 | 来源 | 许可 / 条款 | 修改 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `public/textures/sun.jpg` | 太阳 | [Solar System Scope Textures](https://www.solarsystemscope.com/textures/)（基于 NASA 测绘数据） | CC-BY-4.0 | 分辨率/压缩处理待核实 | 需在公开署名页注明修改 |
| `public/textures/mercury.jpg` | 水星 | Solar System Scope | CC-BY-4.0 | 待核实 | 同上 |
| `public/textures/venus.jpg` | 金星 | Solar System Scope | CC-BY-4.0 | 待核实 | 同上 |
| `public/textures/earth.jpg` | 地球 | Solar System Scope | CC-BY-4.0 | 待核实 | 同上 |
| `public/textures/earth_clouds.jpg` | 地球云层 | Solar System Scope | CC-BY-4.0 | 待核实 | 同上 |
| `public/textures/mars.jpg` | 火星 | Solar System Scope | CC-BY-4.0 | 待核实 | 同上 |
| `public/textures/jupiter.jpg` | 木星 | Solar System Scope | CC-BY-4.0 | 待核实 | 同上 |
| `public/textures/saturn.jpg` | 土星 | threex.planets，源自 Planet Pixel Emporium | PPE | 待核实 | **⚠ 需处理**：取得书面确认或替换 |
| `public/textures/uranus.jpg` | 天王星 | threex.planets，源自 Planet Pixel Emporium | PPE | 待核实 | **⚠ 需处理** |
| `public/textures/neptune.jpg` | 海王星 | threex.planets，源自 Planet Pixel Emporium | PPE | 待核实 | **⚠ 需处理** |
| `public/textures/pluto.jpg` | 冥王星 | threex.planets，源自 Planet Pixel Emporium | PPE | 待核实 | **⚠ 需处理**（可考虑 New Horizons / NASA 全球图替换） |
| `public/textures/saturn_ring_color.jpg` | 土星环颜色 | threex.planets，源自 Planet Pixel Emporium | PPE | 待核实 | **⚠ 需处理** |
| `public/textures/saturn_ring_pattern.gif` | 土星环透明度 | threex.planets，源自 Planet Pixel Emporium | PPE | 待核实 | **⚠ 需处理** |
| `public/textures/moon.jpg` | 月球 | three.js 官方示例资源 | 待核实（three.js 代码为 MIT，但示例贴图的上游来源与条款未在仓库固化） | 待核实 | **⚠ 需处理**：建议替换为 [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) 并记录文件与处理流程 |
| `public/textures/milky_way.jpg` | 银河全景天幕 | [ESO / S. Brunier — The Milky Way panorama](https://www.eso.org/public/images/eso0932a/) | CC-BY-4.0 | 缩放/压缩处理待核实 | 需保留 `ESO / S. Brunier` 署名与修改说明 |

## 其他素材与数据

| 项目 | 位置 | 来源 | 许可 / 条款 | 修改 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 字体 Noto Sans SC、Orbitron、Space Mono | `index.html` 通过 Google Fonts 远程加载（未打包进仓库） | [Google Fonts](https://fonts.google.com/) | OFL-1.1 | 无 | 远程加载会向 Google 发送访客 IP；面向 EEA 等地区时考虑自托管并在隐私政策中说明 |
| 航天器 Horizons 离线星历 | `public/ephemerides/`（构建时复制为哈希文件） | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)，由 `scripts/fetch-horizons-trajectories.mjs` 生成 | JPL 科学数据，保留来源 | 重采样为离线 JSON | 已在 README 注明 |
| 行星星历与小天体根数 | `src/data/` | [JPL Approximate Positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html)、[JPL SBDB](https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html) | JPL 科学数据，保留来源 | 数值嵌入源码 | 已在 README 注明 |
| 站点图标 | `public/favicon.svg` | 待核实（推定为项目自建） | 待核实 | 待核实 | 确认作者 |
| npm 运行时依赖 | 打包进 `dist/assets/` | React、three.js、@react-three/*、Radix UI、lucide-react 等 | 各依赖自身许可证（以 `node_modules/*/LICENSE` 为准） | 打包压缩 | 商业发布前可生成依赖许可证清单 |
