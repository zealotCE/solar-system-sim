/** Declarative, user-facing historical stories. Dates are UTC calendar dates. */
export type MissionStoryEvent = {
  id: string
  date: string
  title: string
  titleEn: string
  narrative: string
  narrativeEn: string
  craftId: string
  relatedTargetIds: string[]
  /** Encounter/context body shown in the story; playback follows the craft. */
  focusTargetId: string
  sourceUrl: string
}

export type MissionStory = {
  id: string
  craftId: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  sourceUrl: string
  events: MissionStoryEvent[]
}

export const MISSION_STORIES: MissionStory[] = [
  {
    id: 'voyager2-grand-tour', craftId: 'voyager2', title: '旅行者 2 号：巨行星大巡游', titleEn: 'Voyager 2: Grand Tour of the Giants',
    description: '唯一飞掠过四颗巨行星的探测器，把人类的视野一路带到海王星。',
    descriptionEn: 'The only spacecraft to visit all four giant planets carried humanity’s view all the way to Neptune.',
    sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/',
    events: [
      { id: 'launch', date: '1977-08-20', title: '从地球出发', titleEn: 'Departure from Earth', narrative: '旅行者 2 号由泰坦 IIIE/半人马上面级从卡纳维拉尔角发射，开始借助巨行星引力前行的旅程。', narrativeEn: 'Voyager 2 launched from Cape Canaveral aboard a Titan IIIE-Centaur, beginning a journey shaped by gravity assists from the giant planets.', craftId: 'voyager2', relatedTargetIds: ['earth', 'voyager2'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'jupiter', date: '1979-07-09', title: '飞掠木星', titleEn: 'Jupiter flyby', narrative: '最近接木星时，它观测到木星大气、卫星与微弱环系统，并获得前往土星的引力助推。', narrativeEn: 'At closest approach it surveyed Jupiter’s atmosphere, moons, and faint rings while gaining the gravity assist needed to reach Saturn.', craftId: 'voyager2', relatedTargetIds: ['jupiter', 'voyager2'], focusTargetId: 'jupiter', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'saturn', date: '1981-08-26', title: '飞掠土星', titleEn: 'Saturn flyby', narrative: '在土星最近接后，任务团队选择了通向天王星的轨道，让这趟旅行继续驶向此前未被探测器造访的冰巨星。', narrativeEn: 'After Saturn, the team selected a path toward Uranus, extending the mission to an ice giant no spacecraft had visited.', craftId: 'voyager2', relatedTargetIds: ['saturn', 'voyager2'], focusTargetId: 'saturn', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'uranus', date: '1986-01-24', title: '首次近访天王星', titleEn: 'First encounter with Uranus', narrative: '旅行者 2 号成为首个飞掠天王星的航天器，发现了新卫星和环，并揭示其异常倾斜的磁场。', narrativeEn: 'Voyager 2 became the first spacecraft to visit Uranus, discovering moons and rings and revealing its unusually tilted magnetic field.', craftId: 'voyager2', relatedTargetIds: ['uranus', 'voyager2'], focusTargetId: 'uranus', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'neptune', date: '1989-08-25', title: '抵达海王星', titleEn: 'Arrival at Neptune', narrative: '它完成对海王星及其卫星的首次近距离考察，拍下大黑斑并发现海卫一活跃的氮冰喷流。', narrativeEn: 'It completed the first close survey of Neptune and its moons, imaging the Great Dark Spot and active nitrogen geysers on Triton.', craftId: 'voyager2', relatedTargetIds: ['neptune', 'triton', 'voyager2'], focusTargetId: 'neptune', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'interstellar', date: '2018-11-05', title: '进入星际空间', titleEn: 'Entry into interstellar space', narrative: '等离子体仪器数据表明它越过日球层顶，成为第二个直接采样星际空间环境的人类探测器。', narrativeEn: 'Plasma measurements showed that it had crossed the heliopause, becoming the second human-made probe to sample interstellar space directly.', craftId: 'voyager2', relatedTargetIds: ['voyager2'], focusTargetId: 'voyager2', sourceUrl: 'https://science.nasa.gov/missions/voyager/voyager-2/' },
    ],
  },
  {
    id: 'new-horizons-frontier', craftId: 'newhorizons', title: '新视野号：穿越冥王星之后', titleEn: 'New Horizons: Beyond Pluto',
    description: '从冥王星掠过到柯伊伯带深处，它把曾经模糊的边疆变成了可被丈量的世界。',
    descriptionEn: 'From Pluto to the Kuiper Belt, it transformed a blurry frontier into worlds that could be measured.',
    sourceUrl: 'https://science.nasa.gov/mission/new-horizons/',
    events: [
      { id: 'launch', date: '2006-01-19', title: '快速离开地球', titleEn: 'A fast departure from Earth', narrative: '新视野号从卡纳维拉尔角发射，成为当时离开地球速度最快的航天器。', narrativeEn: 'New Horizons launched from Cape Canaveral and became the fastest spacecraft then to depart Earth.', craftId: 'newhorizons', relatedTargetIds: ['earth', 'newhorizons'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/' },
      { id: 'jupiter', date: '2007-02-28', title: '借木星加速', titleEn: 'A boost from Jupiter', narrative: '飞掠木星既是一次科学观测机会，也为前往冥王星提供了关键的引力助推。', narrativeEn: 'The Jupiter flyby provided both a science campaign and the critical gravity assist that accelerated the probe toward Pluto.', craftId: 'newhorizons', relatedTargetIds: ['jupiter', 'newhorizons'], focusTargetId: 'jupiter', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/' },
      { id: 'pluto', date: '2015-07-14', title: '首次近访冥王星', titleEn: 'First close encounter with Pluto', narrative: '探测器飞掠冥王星，揭示出心形的汤博区、年轻的冰原与复杂的大气层。', narrativeEn: 'The flyby revealed Pluto’s heart-shaped Tombaugh Regio, geologically young ice plains, and a complex atmosphere.', craftId: 'newhorizons', relatedTargetIds: ['pluto', 'charon', 'newhorizons'], focusTargetId: 'pluto', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/' },
      { id: 'pluto-downlink', date: '2016-10-25', title: '冥王星数据回传完成', titleEn: 'Pluto downlink complete', narrative: '历经一年多的深空回传，冥王星飞掠记录的最后一批科学数据抵达地球，完整数据集随即进入研究阶段。', narrativeEn: 'After more than a year of deep-space transmission, the final recorded flyby data reached Earth and the complete dataset entered analysis.', craftId: 'newhorizons', relatedTargetIds: ['pluto', 'newhorizons'], focusTargetId: 'newhorizons', sourceUrl: 'https://www.nasa.gov/news-release/nasas-new-horizons-completes-pluto-flyby-data-transmission/' },
      { id: 'arrokoth', date: '2019-01-01', title: '邂逅阿罗科斯', titleEn: 'Encounter with Arrokoth', narrative: '它飞掠柯伊伯带天体阿罗科斯，首次近距离观察到一个保存早期太阳系物质的接触双星。', narrativeEn: 'It flew past the Kuiper Belt object Arrokoth, providing the first close view of a contact binary preserving material from the early Solar System.', craftId: 'newhorizons', relatedTargetIds: ['arrokoth', 'newhorizons'], focusTargetId: 'newhorizons', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/' },
    ],
  },
  {
    id: 'galileo-jupiter-system',
    craftId: 'galileo',
    title: '伽利略号：打开木星系统',
    titleEn: 'Galileo: Opening the Jupiter System',
    description: '从金星与地球引力助推，到成为木星首个轨道器，伽利略号建立了现代海洋世界探索的起点。',
    descriptionEn: 'From gravity assists at Venus and Earth to the first Jupiter orbit, Galileo established the foundation for modern ocean-world exploration.',
    sourceUrl: 'https://science.nasa.gov/mission/galileo/',
    events: [
      { id: 'launch', date: '1989-10-18', title: '由亚特兰蒂斯号释放', titleEn: 'Deployed from Atlantis', narrative: '伽利略号随 STS-34 发射，并从航天飞机货舱释放，开始经金星和地球前往木星的六年航程。', narrativeEn: 'Galileo launched with STS-34 and was deployed from Atlantis, beginning a six-year route to Jupiter via Venus and Earth.', craftId: 'galileo', relatedTargetIds: ['earth', 'galileo'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/galileo/' },
      { id: 'venus', date: '1990-02-10', title: '金星引力助推', titleEn: 'Venus gravity assist', narrative: '一次金星飞掠改变了航天器速度和方向，也取得了云层与红外观测数据。', narrativeEn: 'A Venus flyby reshaped the spacecraft’s trajectory while returning cloud and infrared observations.', craftId: 'galileo', relatedTargetIds: ['venus', 'galileo'], focusTargetId: 'venus', sourceUrl: 'https://science.nasa.gov/mission/galileo/' },
      { id: 'jupiter-arrival', date: '1995-12-07', title: '进入木星轨道', titleEn: 'Jupiter orbit insertion', narrative: '大气探测器冲入木星云层，轨道器同时制动，成为首个环绕木星运行的人造物体。', narrativeEn: 'The atmospheric probe entered Jupiter’s clouds while the orbiter braked into orbit, becoming the first artificial satellite of Jupiter.', craftId: 'galileo', relatedTargetIds: ['jupiter', 'galileo'], focusTargetId: 'jupiter', sourceUrl: 'https://science.nasa.gov/mission/galileo/' },
      { id: 'europa', date: '1997-02-20', title: '欧罗巴海洋线索', titleEn: 'Clues to Europa’s ocean', narrative: '近飞影像和磁场数据揭示年轻破碎冰壳，并逐步建立冰下存在咸水海洋的证据。', narrativeEn: 'Close images and magnetic measurements revealed a young, fractured ice shell and strengthened evidence for a salty ocean below.', craftId: 'galileo', relatedTargetIds: ['europa', 'galileo'], focusTargetId: 'europa', sourceUrl: 'https://science.nasa.gov/mission/galileo/' },
      { id: 'end', date: '2003-09-21', title: '受控进入木星', titleEn: 'Controlled entry into Jupiter', narrative: '任务团队让伽利略号进入木星大气，避免未来失控撞击并污染可能宜居的欧罗巴。', narrativeEn: 'The team directed Galileo into Jupiter to prevent an uncontrolled future impact from contaminating potentially habitable Europa.', craftId: 'galileo', relatedTargetIds: ['jupiter', 'galileo'], focusTargetId: 'jupiter', sourceUrl: 'https://science.nasa.gov/mission/galileo/' },
    ],
  },
  {
    id: 'cassini-saturn-odyssey',
    craftId: 'cassini',
    title: '卡西尼号：土星十三年',
    titleEn: 'Cassini: Thirteen Years at Saturn',
    description: '卡西尼与惠更斯共同揭示了土星、环、泰坦和恩克拉多斯组成的活跃世界系统。',
    descriptionEn: 'Cassini and Huygens revealed Saturn, its rings, Titan, and Enceladus as an interconnected system of active worlds.',
    sourceUrl: 'https://science.nasa.gov/mission/cassini/',
    events: [
      { id: 'launch', date: '1997-10-15', title: '启程前往土星', titleEn: 'Departure for Saturn', narrative: '卡西尼－惠更斯组合体由泰坦 IVB/半人马上面级发射，开始近七年的行星际航程。', narrativeEn: 'The Cassini–Huygens spacecraft launched aboard a Titan IVB-Centaur for a nearly seven-year journey to Saturn.', craftId: 'cassini', relatedTargetIds: ['earth', 'cassini'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/cassini/' },
      { id: 'saturn-arrival', date: '2004-07-01', title: '进入土星轨道', titleEn: 'Saturn orbit insertion', narrative: '主发动机在环平面附近点火，卡西尼成为首个土星轨道器。', narrativeEn: 'A main-engine burn near the ring plane made Cassini the first spacecraft to orbit Saturn.', craftId: 'cassini', relatedTargetIds: ['saturn', 'cassini'], focusTargetId: 'saturn', sourceUrl: 'https://science.nasa.gov/mission/cassini/' },
      { id: 'huygens', date: '2005-01-14', title: '惠更斯登陆泰坦', titleEn: 'Huygens lands on Titan', narrative: 'ESA 惠更斯探测器穿过泰坦橙色雾霾，在冰质河道附近着陆并从表面回传数据。', narrativeEn: 'ESA’s Huygens probe descended through Titan’s orange haze, landed near icy drainage channels, and transmitted from the surface.', craftId: 'cassini', relatedTargetIds: ['titan', 'cassini'], focusTargetId: 'titan', sourceUrl: 'https://science.nasa.gov/mission/cassini-huygens/' },
      { id: 'enceladus', date: '2005-07-14', title: '发现恩克拉多斯羽流', titleEn: 'Enceladus plumes revealed', narrative: '近距离观测确认南极裂缝喷出水冰与气体，为地下咸水海洋提供了直接通道。', narrativeEn: 'Close observations confirmed jets of water ice and gas erupting from south-polar fractures, providing direct access to a subsurface ocean.', craftId: 'cassini', relatedTargetIds: ['enceladus', 'cassini'], focusTargetId: 'enceladus', sourceUrl: 'https://science.nasa.gov/mission/cassini/' },
      { id: 'finale', date: '2017-09-15', title: '壮丽终章', titleEn: 'The Grand Finale', narrative: '完成 22 次环内穿越后，卡西尼受控进入土星大气，将最后测量实时传回地球。', narrativeEn: 'After 22 dives between Saturn and its rings, Cassini entered the atmosphere while transmitting final measurements in real time.', craftId: 'cassini', relatedTargetIds: ['saturn', 'cassini'], focusTargetId: 'saturn', sourceUrl: 'https://science.nasa.gov/mission/cassini/' },
    ],
  },
  {
    id: 'dawn-two-worlds',
    craftId: 'dawn',
    title: '黎明号：两个原行星',
    titleEn: 'Dawn: Two Protoplanets',
    description: '离子推进让黎明号先后环绕灶神星与谷神星，完成太阳系探索史上独一无二的双目标任务。',
    descriptionEn: 'Ion propulsion allowed Dawn to orbit both Vesta and Ceres in a unique two-destination mission.',
    sourceUrl: 'https://science.nasa.gov/mission/dawn/',
    events: [
      { id: 'launch', date: '2007-09-27', title: '离子之旅开始', titleEn: 'The ion journey begins', narrative: '黎明号由德尔塔 II 火箭发射，携带三台氙离子发动机前往主小行星带。', narrativeEn: 'Dawn launched aboard a Delta II with three xenon ion engines for its journey to the main asteroid belt.', craftId: 'dawn', relatedTargetIds: ['earth', 'dawn'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/dawn/' },
      { id: 'vesta', date: '2011-07-16', title: '抵达灶神星', titleEn: 'Arrival at Vesta', narrative: '航天器进入灶神星轨道，开始测绘其分异地壳和巨大的南极撞击盆地。', narrativeEn: 'The spacecraft entered orbit around Vesta and began mapping its differentiated crust and enormous south-polar impact basin.', craftId: 'dawn', relatedTargetIds: ['vesta', 'dawn'], focusTargetId: 'vesta', sourceUrl: 'https://science.nasa.gov/mission/dawn/' },
      { id: 'ceres', date: '2015-03-06', title: '抵达谷神星', titleEn: 'Arrival at Ceres', narrative: '黎明号成为首个环绕矮行星运行的航天器，并很快确认明亮斑点是富盐沉积。', narrativeEn: 'Dawn became the first spacecraft to orbit a dwarf planet and soon identified the bright deposits as salt-rich material.', craftId: 'dawn', relatedTargetIds: ['ceres', 'dawn'], focusTargetId: 'ceres', sourceUrl: 'https://science.nasa.gov/mission/dawn/' },
      { id: 'end', date: '2018-10-31', title: '静默留在谷神星', titleEn: 'Silent in orbit at Ceres', narrative: '姿态控制用联氨耗尽后通信结束；航天器继续留在稳定的谷神星轨道。', narrativeEn: 'Communications ended after hydrazine for attitude control was depleted; the spacecraft remains in a stable orbit around Ceres.', craftId: 'dawn', relatedTargetIds: ['ceres', 'dawn'], focusTargetId: 'ceres', sourceUrl: 'https://science.nasa.gov/mission/dawn/' },
    ],
  },
  {
    id: 'rosetta-comet-escort',
    craftId: 'rosetta',
    title: '罗塞塔号：与彗星同行',
    titleEn: 'Rosetta: Escorting a Comet',
    description: '十年追赶后，罗塞塔号在 67P 彗星身边工作两年，见证它接近太阳并重新沉寂。',
    descriptionEn: 'After a ten-year chase, Rosetta spent two years beside comet 67P and watched it awaken near the Sun.',
    sourceUrl: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta',
    events: [
      { id: 'launch', date: '2004-03-02', title: '开始十年追赶', titleEn: 'A ten-year chase begins', narrative: '罗塞塔号由阿丽亚娜 5G+ 发射，随后借助地球和火星引力逐步匹配彗星轨道。', narrativeEn: 'Rosetta launched on an Ariane 5G+ and used Earth and Mars gravity assists to gradually match the comet’s orbit.', craftId: 'rosetta', relatedTargetIds: ['earth', 'rosetta'], focusTargetId: 'earth', sourceUrl: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta' },
      { id: 'arrival', date: '2014-08-06', title: '会合 67P', titleEn: 'Rendezvous with 67P', narrative: '经过一系列制动，罗塞塔号成为首个与彗星会合并长期伴飞的航天器。', narrativeEn: 'After a series of braking maneuvers, Rosetta became the first spacecraft to rendezvous with and escort a comet.', craftId: 'rosetta', relatedTargetIds: ['67p', 'rosetta'], focusTargetId: '67p', sourceUrl: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta' },
      { id: 'philae', date: '2014-11-12', title: '菲莱触及彗核', titleEn: 'Philae touches the nucleus', narrative: '菲莱完成首次彗星软着陆；固定装置未启动使它反弹后停在阴影区域，但仍传回原位数据。', narrativeEn: 'Philae made the first soft landing on a comet. Failed anchoring caused a bounce into shadow, but the lander still returned in-situ data.', craftId: 'rosetta', relatedTargetIds: ['67p', 'rosetta'], focusTargetId: '67p', sourceUrl: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta' },
      { id: 'end', date: '2016-09-30', title: '降落在 Ma’at 区', titleEn: 'Descent to the Ma’at region', narrative: '任务以低速受控降落结束，在最后数小时取得前所未有的近距离尘埃与表面数据。', narrativeEn: 'The mission ended with a slow controlled descent, collecting unprecedented close-range dust and surface data during its final hours.', craftId: 'rosetta', relatedTargetIds: ['67p', 'rosetta'], focusTargetId: '67p', sourceUrl: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta' },
    ],
  },
  {
    id: 'osiris-sample-to-apophis',
    craftId: 'osirisrex',
    title: 'OSIRIS-REx：从贝努到阿波菲斯',
    titleEn: 'OSIRIS-REx: From Bennu to Apophis',
    description: '一次小行星采样返回任务在交付样本后获得新名字和新目标，继续研究 2029 年近地飞掠。',
    descriptionEn: 'After delivering an asteroid sample, the spacecraft gained a new name and target for the 2029 close Earth encounter.',
    sourceUrl: 'https://science.nasa.gov/mission/osiris-rex/',
    events: [
      { id: 'launch', date: '2016-09-08', title: '启程寻找贝努', titleEn: 'Departure for Bennu', narrative: 'OSIRIS-REx 由宇宙神 V 火箭发射，开始美国首次小行星采样返回任务。', narrativeEn: 'OSIRIS-REx launched on an Atlas V to begin the first U.S. asteroid sample-return mission.', craftId: 'osirisrex', relatedTargetIds: ['earth', 'osirisrex'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/osiris-rex/' },
      { id: 'bennu-arrival', date: '2018-12-03', title: '抵达贝努', titleEn: 'Arrival at Bennu', narrative: '航天器抵达这颗碎石堆小行星，并开始测绘形状、质量、矿物与候选采样区。', narrativeEn: 'The spacecraft reached the rubble-pile asteroid and began mapping its shape, mass, minerals, and candidate sample sites.', craftId: 'osirisrex', relatedTargetIds: ['bennu', 'osirisrex'], focusTargetId: 'bennu', sourceUrl: 'https://science.nasa.gov/mission/osiris-rex/' },
      { id: 'tag', date: '2020-10-20', title: '触碰夜莺区', titleEn: 'Touchdown at Nightingale', narrative: 'TAGSAM 采样头短暂接触表面，以氮气扰动风化层并收集远超最低目标质量的样本。', narrativeEn: 'The TAGSAM head briefly touched the surface, stirred regolith with nitrogen gas, and collected far more than the minimum sample goal.', craftId: 'osirisrex', relatedTargetIds: ['bennu', 'osirisrex'], focusTargetId: 'bennu', sourceUrl: 'https://science.nasa.gov/mission/osiris-rex/' },
      { id: 'return', date: '2023-09-24', title: '样本返回地球', titleEn: 'Sample return to Earth', narrative: '返回舱在犹他州着陆；母船绕过地球并以 OSIRIS-APEX 之名飞向阿波菲斯。', narrativeEn: 'The return capsule landed in Utah while the mothership passed Earth and continued toward Apophis as OSIRIS-APEX.', craftId: 'osirisrex', relatedTargetIds: ['earth', 'osirisrex'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/osiris-rex/' },
      { id: 'apophis', date: '2029-04-13', title: '阿波菲斯近地飞掠', titleEn: 'Apophis close Earth flyby', narrative: '阿波菲斯将安全穿过地球同步轨道内侧；扩展任务随后研究潮汐作用造成的自转和表面变化。', narrativeEn: 'Apophis will safely pass inside geosynchronous orbit; the extended mission will then investigate tidal changes to its spin and surface.', craftId: 'osirisrex', relatedTargetIds: ['earth', 'apophis', 'osirisrex'], focusTargetId: 'apophis', sourceUrl: 'https://science.nasa.gov/mission/osiris-apex/' },
    ],
  },
  {
    id: 'lucy-trojan-tour',
    craftId: 'lucy',
    title: '露西号：特洛伊化石',
    titleEn: 'Lucy: Fossils of Planet Formation',
    description: '露西号利用三次地球引力助推，依次抽样主带天体和木星两群特洛伊小行星。',
    descriptionEn: 'Lucy uses three Earth gravity assists to sample main-belt objects and both swarms of Jupiter Trojans.',
    sourceUrl: 'https://science.nasa.gov/mission/lucy/',
    events: [
      { id: 'launch', date: '2021-10-16', title: '十二年巡游启程', titleEn: 'A twelve-year tour begins', narrative: '露西号由宇宙神 V 401 火箭发射，巨大的圆形太阳翼展开后开始首个特洛伊任务。', narrativeEn: 'Lucy launched on an Atlas V 401 and deployed its large circular solar arrays for the first Trojan mission.', craftId: 'lucy', relatedTargetIds: ['earth', 'lucy'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/lucy/' },
      { id: 'dinkinesh', date: '2023-11-01', title: '意外复杂的 Dinkinesh', titleEn: 'A surprising Dinkinesh', narrative: '首次飞掠揭示 Dinkinesh 是接触双体，并带有同样由两个叶瓣组成的小卫星 Selam。', narrativeEn: 'The first flyby revealed Dinkinesh as a contact binary with a moon, Selam, that is itself made of two lobes.', craftId: 'lucy', relatedTargetIds: ['lucy'], focusTargetId: 'lucy', sourceUrl: 'https://science.nasa.gov/mission/lucy/' },
      { id: 'donaldjohanson', date: '2025-04-20', title: '飞掠 Donaldjohanson', titleEn: 'Donaldjohanson flyby', narrative: '第二次主带演练目标为后续特洛伊高速成像验证仪器和自主跟踪流程。', narrativeEn: 'A second main-belt rehearsal validated instruments and autonomous tracking for the later high-speed Trojan encounters.', craftId: 'lucy', relatedTargetIds: ['lucy'], focusTargetId: 'lucy', sourceUrl: 'https://science.nasa.gov/mission/lucy/' },
      { id: 'eurybates', date: '2027-08-11', title: '抵达欧律巴忒斯系统', titleEn: 'Eurybates system encounter', narrative: '露西号计划飞掠这颗 C 型特洛伊小行星及其小卫星 Queta，开始 L4 希腊营巡游。', narrativeEn: 'Lucy is scheduled to visit this C-type Trojan and its moon Queta, opening the tour of the leading L4 swarm.', craftId: 'lucy', relatedTargetIds: ['eurybates', 'lucy'], focusTargetId: 'eurybates', sourceUrl: 'https://science.nasa.gov/mission/lucy/' },
      { id: 'patroclus', date: '2033-03-03', title: '双小行星终章', titleEn: 'Final binary encounter', narrative: '任务计划在 L5 特洛伊群飞掠大小相近的 Patroclus–Menoetius 双小行星，完成跨两群比较。', narrativeEn: 'The nominal tour ends in the L5 swarm at the near-equal Patroclus–Menoetius binary, completing a comparison across both swarms.', craftId: 'lucy', relatedTargetIds: ['lucy'], focusTargetId: 'lucy', sourceUrl: 'https://science.nasa.gov/mission/lucy/' },
    ],
  },
  {
    id: 'psyche-metal-world',
    craftId: 'psyche',
    title: '灵神星号：金属世界',
    titleEn: 'Psyche: Journey to a Metal World',
    description: '任务将首次近距离研究富金属小行星，并在巡航阶段测试深空光通信。',
    descriptionEn: 'The mission will make the first close study of a metal-rich asteroid while testing optical communications during cruise.',
    sourceUrl: 'https://science.nasa.gov/mission/psyche/',
    events: [
      { id: 'launch', date: '2023-10-13', title: '猎鹰重型火箭发射', titleEn: 'Falcon Heavy launch', narrative: '灵神星号从肯尼迪航天中心发射，开始利用太阳电推进前往主小行星带。', narrativeEn: 'Psyche launched from Kennedy Space Center and began a solar-electric-propulsion cruise to the main asteroid belt.', craftId: 'psyche', relatedTargetIds: ['earth', 'psyche'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/psyche/' },
      { id: 'mars', date: '2026-05-15', title: '火星引力助推', titleEn: 'Mars gravity assist', narrative: '任务轨迹利用一次火星近飞改变速度和方向，为 2029 年抵达灵神星节省推进剂。', narrativeEn: 'A Mars flyby reshapes the trajectory and saves propellant for the planned 2029 arrival at Psyche.', craftId: 'psyche', relatedTargetIds: ['mars', 'psyche'], focusTargetId: 'mars', sourceUrl: 'https://science.nasa.gov/mission/psyche/' },
      { id: 'arrival', date: '2029-07-31', title: '计划抵达灵神星', titleEn: 'Planned arrival at Psyche', narrative: '航天器计划被小行星引力捕获，随后逐步降低极轨高度，展开约两年的分阶段测绘。', narrativeEn: 'The spacecraft is planned to enter orbit and progressively lower its polar mapping altitude during a roughly two-year prime mission.', craftId: 'psyche', relatedTargetIds: ['psyche16', 'psyche'], focusTargetId: 'psyche16', sourceUrl: 'https://science.nasa.gov/mission/psyche/' },
    ],
  },
  {
    id: 'europa-clipper-ocean-world',
    craftId: 'europaclipper',
    title: '欧罗巴快船：海洋世界',
    titleEn: 'Europa Clipper: An Ocean World',
    description: '航天器不环绕欧罗巴，而是在木星长椭圆轨道上反复近飞，以减少辐射暴露并覆盖不同区域。',
    descriptionEn: 'The spacecraft will not orbit Europa; it will repeatedly fly past from long Jupiter orbits to reduce radiation exposure and cover varied terrain.',
    sourceUrl: 'https://science.nasa.gov/mission/europa-clipper/',
    events: [
      { id: 'launch', date: '2024-10-14', title: '最大行星际航天器启程', titleEn: 'NASA’s largest planetary craft departs', narrative: '欧罗巴快船由猎鹰重型火箭发射，展开太阳翼后的跨度超过 30 米。', narrativeEn: 'Europa Clipper launched on Falcon Heavy and spans more than 30 metres with its solar arrays deployed.', craftId: 'europaclipper', relatedTargetIds: ['earth', 'europaclipper'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/europa-clipper/' },
      { id: 'mars', date: '2025-03-01', title: '火星引力助推', titleEn: 'Mars gravity assist', narrative: '近飞火星提供第一次关键引力助推，将航天器送往下一次地球会合。', narrativeEn: 'A close Mars flyby provides the first major gravity assist and sends the spacecraft toward its next Earth encounter.', craftId: 'europaclipper', relatedTargetIds: ['mars', 'europaclipper'], focusTargetId: 'mars', sourceUrl: 'https://science.nasa.gov/mission/europa-clipper/' },
      { id: 'earth', date: '2026-12-03', title: '返回地球加速', titleEn: 'Earth gravity assist', narrative: '地球近飞将提供前往木星所需的最后大幅速度变化。', narrativeEn: 'The Earth flyby supplies the final major velocity change needed to reach Jupiter.', craftId: 'europaclipper', relatedTargetIds: ['earth', 'europaclipper'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/europa-clipper/' },
      { id: 'jupiter', date: '2030-04-11', title: '计划抵达木星', titleEn: 'Planned Jupiter arrival', narrative: '主发动机点火将航天器捕获进木星轨道，随后利用大型卫星引力设置欧罗巴近飞序列。', narrativeEn: 'A main-engine burn is planned to capture the spacecraft at Jupiter before moon gravity assists shape the Europa flyby campaign.', craftId: 'europaclipper', relatedTargetIds: ['jupiter', 'europaclipper'], focusTargetId: 'jupiter', sourceUrl: 'https://science.nasa.gov/mission/europa-clipper/' },
      { id: 'europa', date: '2031-05-01', title: '欧罗巴近飞阶段', titleEn: 'Europa flyby campaign', narrative: '约 49 次近飞将以雷达、光谱仪、相机、磁强计和粒子仪器联合探测冰壳与海洋。', narrativeEn: 'About 49 flybys will combine radar, spectroscopy, imaging, magnetic, and particle measurements to investigate the ice shell and ocean.', craftId: 'europaclipper', relatedTargetIds: ['europa', 'europaclipper'], focusTargetId: 'europa', sourceUrl: 'https://science.nasa.gov/mission/europa-clipper/' },
    ],
  },
]

export function getMissionStoryEvent(storyId: string, eventId: string): MissionStoryEvent | null {
  return MISSION_STORIES.find((story) => story.id === storyId)?.events.find((event) => event.id === eventId) ?? null
}

/** Historical playback always follows the observer spacecraft through the event. */
export function getMissionStoryPlaybackTarget(
  event: MissionStoryEvent,
): string {
  return event.craftId
}

/** Returns the historical timeline owned by a spacecraft archive, if one exists. */
export function getMissionStoryForCraft(craftId: string): MissionStory | null {
  return MISSION_STORIES.find((story) => story.craftId === craftId) ?? null
}
