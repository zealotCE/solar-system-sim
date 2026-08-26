export type ArchiveHighlight = {
  zh: string
  en: string
}

export type ArchiveProfile = {
  objective: string
  objectiveEn: string
  legacy: string
  legacyEn: string
  highlights: ArchiveHighlight[]
}

/** Editorial mission context shown in the archive beyond the short overview. */
const SPACECRAFT_ARCHIVES: Record<string, ArchiveProfile> = {
  voyager1: {
    objective: '近距离研究木星与土星，随后测量日球层边界及星际介质。',
    objectiveEn: 'Study Jupiter and Saturn at close range, then measure the heliosphere’s boundary and interstellar medium.',
    legacy: '它把外太阳系的行星探测延伸成了持续数十年的星际环境实验。',
    legacyEn: 'It turned an outer-planet tour into a decades-long experiment in the local interstellar environment.',
    highlights: [
      { zh: '发现木卫一活跃火山', en: 'DISCOVERED ACTIVE VOLCANISM ON IO' },
      { zh: '1980 年飞掠土卫六', en: 'TITAN FLYBY IN 1980' },
      { zh: '2012 年穿越日球层顶', en: 'CROSSED THE HELIOPAUSE IN 2012' },
    ],
  },
  voyager2: {
    objective: '利用罕见行星排列完成四颗巨行星的大巡游，并继续测量日球层之外的等离子体。',
    objectiveEn: 'Use a rare planetary alignment to tour all four giant planets and continue plasma measurements beyond the heliosphere.',
    legacy: '截至今天，它仍是唯一近距离造访天王星和海王星的航天器。',
    legacyEn: 'It remains the only spacecraft ever to visit Uranus and Neptune at close range.',
    highlights: [
      { zh: '首次飞掠天王星', en: 'FIRST URANUS FLYBY' },
      { zh: '首次飞掠海王星与海卫一', en: 'FIRST NEPTUNE AND TRITON FLYBYS' },
      { zh: '2018 年进入星际空间', en: 'ENTERED INTERSTELLAR SPACE IN 2018' },
    ],
  },
  pioneer10: {
    objective: '验证穿越小行星带的可行性，并首次近距离测量木星环境。',
    objectiveEn: 'Demonstrate safe passage through the asteroid belt and make the first close measurements of Jupiter.',
    legacy: '先驱者 10 号为旅行者任务打开道路，也首次携带面向潜在发现者的人类信息牌。',
    legacyEn: 'Pioneer 10 opened the route for Voyager and carried the first human message intended for possible finders beyond Earth.',
    highlights: [
      { zh: '首个穿越小行星带的探测器', en: 'FIRST SPACECRAFT THROUGH THE ASTEROID BELT' },
      { zh: '1973 年首次飞掠木星', en: 'FIRST JUPITER FLYBY IN 1973' },
      { zh: '最后遥测信号：2002 年', en: 'LAST TELEMETRY RECEIVED IN 2002' },
    ],
  },
  newhorizons: {
    objective: '首次侦察冥王星系统，并继续探索柯伊伯带的原始天体与环境。',
    objectiveEn: 'Perform the first reconnaissance of Pluto and continue into the Kuiper Belt to study primitive bodies and the distant environment.',
    legacy: '它把冥王星从模糊光点变成一个具有冰川、山脉、雾霾和活跃地质的复杂世界。',
    legacyEn: 'It transformed Pluto from a blurry point into a complex world of glaciers, mountains, haze, and active geology.',
    highlights: [
      { zh: '2015 年冥王星飞掠', en: 'PLUTO FLYBY IN 2015' },
      { zh: '发现斯普特尼克平原年轻冰面', en: 'REVEALED THE YOUNG ICE OF SPUTNIK PLANITIA' },
      { zh: '2019 年飞掠阿罗科斯', en: 'ARROKOTH FLYBY IN 2019' },
    ],
  },
  cassini: {
    objective: '长期研究土星大气、磁层、环系及其多样卫星，并由惠更斯探测泰坦表面。',
    objectiveEn: 'Study Saturn’s atmosphere, magnetosphere, rings, and moons over many years while Huygens explored Titan’s surface.',
    legacy: '卡西尼把土星系统展示为一个活跃实验室：泰坦拥有甲烷循环，恩克拉多斯地下海洋向太空喷射物质。',
    legacyEn: 'Cassini revealed an active system: methane weather on Titan and an ocean on Enceladus venting material into space.',
    highlights: [
      { zh: '惠更斯于 2005 年登陆泰坦', en: 'HUYGENS LANDED ON TITAN IN 2005' },
      { zh: '确认恩克拉多斯冰羽流与地下海洋', en: 'CONFIRMED ENCELADUS PLUMES AND OCEAN' },
      { zh: '2017 年壮丽终章', en: 'GRAND FINALE IN 2017' },
    ],
  },
  galileo: {
    objective: '从轨道系统研究木星及其大型卫星，并用大气探测器直接测量木星云层之下。',
    objectiveEn: 'Survey Jupiter and its major moons from orbit and directly sample the atmosphere with an entry probe.',
    legacy: '伽利略奠定了欧罗巴地下海洋假说，并记录了木卫一持续的火山活动。',
    legacyEn: 'Galileo established the case for a subsurface ocean at Europa and documented sustained volcanic activity on Io.',
    highlights: [
      { zh: '首次飞掠小行星并发现小行星卫星', en: 'FIRST ASTEROID FLYBYS AND ASTEROID MOON DISCOVERY' },
      { zh: '1995 年进入木星轨道', en: 'ENTERED JUPITER ORBIT IN 1995' },
      { zh: '完成 34 圈木星轨道', en: 'COMPLETED 34 JUPITER ORBITS' },
    ],
  },
  dawn: {
    objective: '比较灶神星和谷神星，以重建原行星在岩石与冰含量差异下的演化。',
    objectiveEn: 'Compare Vesta and Ceres to reconstruct how protoplanets evolved with different rock and ice inventories.',
    legacy: '高效离子推进首次让一艘航天器在两个地外目标之间脱离并再次入轨。',
    legacyEn: 'Efficient ion propulsion enabled the first mission to leave one extraterrestrial orbit and enter another.',
    highlights: [
      { zh: '2011 年抵达灶神星', en: 'ARRIVED AT VESTA IN 2011' },
      { zh: '2015 年抵达谷神星', en: 'ARRIVED AT CERES IN 2015' },
      { zh: '发现奥卡托撞击坑明亮盐沉积', en: 'FOUND BRIGHT SALTS IN OCCATOR CRATER' },
    ],
  },
  rosetta: {
    objective: '伴飞 67P 彗星跨越近日点，测量彗核、气体、尘埃及其随太阳加热发生的变化。',
    objectiveEn: 'Escort comet 67P through perihelion and measure its nucleus, gas, dust, and response to solar heating.',
    legacy: '它首次把彗星从短暂飞掠目标变成可持续观测数年的动态世界。',
    legacyEn: 'It turned a comet from a brief flyby target into a changing world observed continuously for years.',
    highlights: [
      { zh: '2014 年成为首个彗星轨道器', en: 'FIRST COMET ORBITER IN 2014' },
      { zh: '投放菲莱着陆器', en: 'DEPLOYED THE PHILAE LANDER' },
      { zh: '2016 年受控降落于 67P', en: 'CONTROLLED DESCENT TO 67P IN 2016' },
    ],
  },
  osirisrex: {
    objective: '测绘并采集贝努表面物质返回地球；扩展任务将研究阿波菲斯近地飞掠后的变化。',
    objectiveEn: 'Map and return material from Bennu; the extended mission will study Apophis after its close Earth encounter.',
    legacy: '返回样本为早期太阳系水合矿物、有机物和行星形成过程提供了可在实验室反复研究的档案。',
    legacyEn: 'Returned samples provide a laboratory archive of hydrated minerals, organics, and early planetary processes.',
    highlights: [
      { zh: '2020 年完成“触碰即走”采样', en: 'TOUCH-AND-GO SAMPLE COLLECTION IN 2020' },
      { zh: '2023 年样本返回地球', en: 'SAMPLE RETURNED TO EARTH IN 2023' },
      { zh: '2029 年会合阿波菲斯', en: 'APOPHIS RENDEZVOUS CAMPAIGN IN 2029' },
    ],
  },
  lucy: {
    objective: '飞掠多个木星特洛伊小行星系统，比较其地质、颜色、组成、质量与卫星。',
    objectiveEn: 'Fly past multiple Jupiter Trojan systems and compare their geology, color, composition, mass, and satellites.',
    legacy: '其多目标路线将首次抽样两个特洛伊群，为巨行星迁移模型提供直接约束。',
    legacyEn: 'Its multi-target route will sample both Trojan swarms and directly constrain models of giant-planet migration.',
    highlights: [
      { zh: '2023 年发现 Dinkinesh 接触双星及卫星', en: 'REVEALED DINKINESH AS A CONTACT BINARY WITH A MOON' },
      { zh: '2025 年飞掠 Donaldjohanson', en: 'DONALDJOHANSON FLYBY IN 2025' },
      { zh: '2027–2033 年特洛伊目标巡游', en: 'TROJAN TOUR FROM 2027 TO 2033' },
    ],
  },
  psyche: {
    objective: '确定 16 Psyche 的组成、地形、内部结构、磁性与形成历史。',
    objectiveEn: 'Determine 16 Psyche’s composition, geology, interior, magnetic history, and origin.',
    legacy: '这是首次专门研究富金属小行星的任务，也在巡航阶段验证深空激光通信。',
    legacyEn: 'It is the first mission dedicated to a metal-rich asteroid and is demonstrating deep-space laser communications during cruise.',
    highlights: [
      { zh: '2023 年由猎鹰重型火箭发射', en: 'LAUNCHED ON FALCON HEAVY IN 2023' },
      { zh: '2026 年火星引力助推', en: 'MARS GRAVITY ASSIST IN 2026' },
      { zh: '计划 2029 年抵达灵神星', en: 'PLANNED PSYCHE ARRIVAL IN 2029' },
    ],
  },
  europaclipper: {
    objective: '通过多次近飞判断欧罗巴冰壳、海洋、组成和地质是否具备支持生命的环境。',
    objectiveEn: 'Use repeated flybys to determine whether Europa’s ice shell, ocean, composition, and geology could support life.',
    legacy: '它不直接寻找生命，而是首次以完整仪器组合系统评估一个外太阳系海洋世界的宜居性。',
    legacyEn: 'It will not search for life directly; it will make the first comprehensive assessment of an outer-system ocean world’s habitability.',
    highlights: [
      { zh: '展开跨度达 30.5 米', en: '30.5-METRE DEPLOYED SPAN' },
      { zh: '计划 2030 年进入木星系统', en: 'JUPITER ARRIVAL PLANNED FOR 2030' },
      { zh: '约 49 次欧罗巴近飞', en: 'ABOUT 49 EUROPA FLYBYS' },
    ],
  },
  parker: {
    objective: '在日冕内部直接测量太阳风的起源、加热和加速机制。',
    objectiveEn: 'Measure the origin, heating, and acceleration of the solar wind from inside the corona.',
    legacy: '它成为首个进入太阳大气的航天器，并不断刷新人造物体速度和近太阳距离纪录。',
    legacyEn: 'It became the first spacecraft to enter the Sun’s atmosphere and repeatedly set speed and proximity records.',
    highlights: [
      { zh: '2021 年首次确认穿越日冕', en: 'FIRST CONFIRMED CORONAL PASSAGE IN 2021' },
      { zh: '利用金星七次调整轨道', en: 'SEVEN VENUS GRAVITY ASSISTS' },
      { zh: '峰值速度约 190 km/s', en: 'PEAK SPEED ABOUT 190 km/s' },
    ],
  },
  jwst: {
    objective: '以红外波段研究早期星系、恒星与行星形成，以及太阳系内外的行星大气。',
    objectiveEn: 'Use infrared observations to study early galaxies, star and planet formation, and atmospheres within and beyond the Solar System.',
    legacy: '韦伯把高灵敏红外光谱扩展到早期宇宙和系外行星，成为多领域共享的旗舰观测台。',
    legacyEn: 'Webb extends sensitive infrared spectroscopy to the early universe and exoplanets as a shared flagship observatory.',
    highlights: [
      { zh: '6.5 米分段主镜', en: '6.5-METRE SEGMENTED PRIMARY MIRROR' },
      { zh: '五层可展开遮阳板', en: 'FIVE-LAYER DEPLOYABLE SUNSHIELD' },
      { zh: '运行于日地 L2 附近', en: 'OPERATES NEAR SUN–EARTH L2' },
    ],
  },
  juno: {
    objective: '测量木星内部结构、深层大气、极区、磁场和重力场，追溯巨行星形成。',
    objectiveEn: 'Measure Jupiter’s interior, deep atmosphere, poles, magnetic field, and gravity to reconstruct giant-planet formation.',
    legacy: '其极轨道首次持续展示木星两极气旋群，并把大气探测延伸到云层深处。',
    legacyEn: 'Its polar orbit revealed persistent cyclone patterns at both poles and probed far beneath the visible clouds.',
    highlights: [
      { zh: '2016 年进入木星轨道', en: 'ENTERED JUPITER ORBIT IN 2016' },
      { zh: '首个太阳能木星任务', en: 'FIRST SOLAR-POWERED JUPITER MISSION' },
      { zh: '近飞木卫三、欧罗巴和木卫一', en: 'CLOSE FLYBYS OF GANYMEDE, EUROPA, AND IO' },
    ],
  },
  hubble: {
    objective: '在大气层之上进行紫外、可见光和近红外高分辨率观测。',
    objectiveEn: 'Make high-resolution ultraviolet, visible, and near-infrared observations above Earth’s atmosphere.',
    legacy: '可维护设计让哈勃跨越数代仪器持续工作，建立了现代天文学最具影响力的公开档案之一。',
    legacyEn: 'A serviceable design kept Hubble productive across generations of instruments, creating one of astronomy’s most influential public archives.',
    highlights: [
      { zh: '1990 年由发现号部署', en: 'DEPLOYED BY DISCOVERY IN 1990' },
      { zh: '五次航天飞机维修任务', en: 'FIVE SHUTTLE SERVICING MISSIONS' },
      { zh: '哈勃深场揭示早期星系', en: 'DEEP FIELDS REVEALED THE DISTANT UNIVERSE' },
    ],
  },
  iss: {
    objective: '支持长期载人驻留、微重力科研、技术验证与国际空间合作。',
    objectiveEn: 'Support continuous human presence, microgravity research, technology demonstrations, and international cooperation.',
    legacy: '国际空间站是人类持续在轨生活时间最长、规模最大的合作工程。',
    legacyEn: 'The ISS is humanity’s longest continuously inhabited and largest collaborative orbital facility.',
    highlights: [
      { zh: '1998 年发射首个模块', en: 'FIRST MODULE LAUNCHED IN 1998' },
      { zh: '2000 年起持续有人驻留', en: 'CONTINUOUSLY CREWED SINCE 2000' },
      { zh: '约每 90 分钟绕地一周', en: 'ORBITS EARTH ABOUT EVERY 90 MINUTES' },
    ],
  },
  tiangong: {
    objective: '支持中国长期载人飞行、空间科学实验、技术验证和国际合作载荷。',
    objectiveEn: 'Support long-duration Chinese human spaceflight, science, technology demonstrations, and international payloads.',
    legacy: '三舱组合体建立了中国常态化近地轨道载人科研平台。',
    legacyEn: 'The three-module complex established China’s permanent crewed research platform in low Earth orbit.',
    highlights: [
      { zh: '2021 年发射天和核心舱', en: 'TIANHE CORE MODULE LAUNCHED IN 2021' },
      { zh: '问天与梦天组成 T 字构型', en: 'WENTIAN AND MENGTIAN FORM A T-SHAPED COMPLEX' },
      { zh: '支持长期三人乘组', en: 'SUPPORTS LONG-DURATION THREE-PERSON CREWS' },
    ],
  },
}

export function getArchiveProfile(targetId: string | null): ArchiveProfile | null {
  if (!targetId) return null
  return SPACECRAFT_ARCHIVES[targetId] ?? null
}

