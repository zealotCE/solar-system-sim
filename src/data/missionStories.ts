/** Declarative, user-facing historical stories. Dates are UTC calendar dates. */
export type MissionStoryEvent = {
  id: string
  date: string
  title: string
  narrative: string
  craftId: 'voyager2' | 'newhorizons'
  relatedTargetIds: string[]
  /** Existing scene target to select and follow when this event is applied. */
  focusTargetId: string
  sourceUrl: string
}

export type MissionStory = {
  id: 'voyager2-grand-tour' | 'new-horizons-frontier'
  craftId: 'voyager2' | 'newhorizons'
  title: string
  description: string
  sourceUrl: string
  events: MissionStoryEvent[]
}

export const MISSION_STORIES: MissionStory[] = [
  {
    id: 'voyager2-grand-tour', craftId: 'voyager2', title: '旅行者 2 号：巨行星大巡游',
    description: '唯一飞掠过四颗巨行星的探测器，把人类的视野一路带到海王星。',
    sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/',
    events: [
      { id: 'launch', date: '1977-08-20', title: '从地球出发', narrative: '旅行者 2 号由泰坦 IIIE/半人马上面级从卡纳维拉尔角发射，开始借助巨行星引力前行的旅程。', craftId: 'voyager2', relatedTargetIds: ['earth', 'voyager2'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'jupiter', date: '1979-07-09', title: '飞掠木星', narrative: '最近接木星时，它观测到木星大气、卫星与微弱环系统，并获得前往土星的引力助推。', craftId: 'voyager2', relatedTargetIds: ['jupiter', 'voyager2'], focusTargetId: 'jupiter', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'saturn', date: '1981-08-26', title: '飞掠土星', narrative: '在土星最近接后，任务团队选择了通向天王星的轨道，让这趟旅行继续驶向此前未被探测器造访的冰巨星。', craftId: 'voyager2', relatedTargetIds: ['saturn', 'voyager2'], focusTargetId: 'saturn', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'uranus', date: '1986-01-24', title: '首次近访天王星', narrative: '旅行者 2 号成为首个飞掠天王星的航天器，发现了新卫星和环，并揭示其异常倾斜的磁场。', craftId: 'voyager2', relatedTargetIds: ['uranus', 'voyager2'], focusTargetId: 'uranus', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'neptune', date: '1989-08-25', title: '抵达海王星', narrative: '它完成对海王星及其卫星的首次近距离考察，拍下大黑斑并发现海卫一活跃的氮冰喷流。', craftId: 'voyager2', relatedTargetIds: ['neptune', 'triton', 'voyager2'], focusTargetId: 'neptune', sourceUrl: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      { id: 'interstellar', date: '2018-11-05', title: '进入星际空间', narrative: '等离子体仪器数据表明它越过日球层顶，成为第二个直接采样星际空间环境的人类探测器。', craftId: 'voyager2', relatedTargetIds: ['voyager2'], focusTargetId: 'voyager2', sourceUrl: 'https://science.nasa.gov/missions/voyager/voyager-2/' },
    ],
  },
  {
    id: 'new-horizons-frontier', craftId: 'newhorizons', title: '新视野号：穿越冥王星之后',
    description: '从冥王星掠过到柯伊伯带深处，它把曾经模糊的边疆变成了可被丈量的世界。',
    sourceUrl: 'https://science.nasa.gov/mission/new-horizons/',
    events: [
      { id: 'launch', date: '2006-01-19', title: '快速离开地球', narrative: '新视野号从卡纳维拉尔角发射，成为当时离开地球速度最快的航天器。', craftId: 'newhorizons', relatedTargetIds: ['earth', 'newhorizons'], focusTargetId: 'earth', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/' },
      { id: 'jupiter', date: '2007-02-28', title: '借木星加速', narrative: '飞掠木星既是一次科学观测机会，也为前往冥王星提供了关键的引力助推。', craftId: 'newhorizons', relatedTargetIds: ['jupiter', 'newhorizons'], focusTargetId: 'jupiter', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/' },
      { id: 'pluto', date: '2015-07-14', title: '首次近访冥王星', narrative: '探测器飞掠冥王星，揭示出心形的汤博区、年轻的冰原与复杂的大气层。', craftId: 'newhorizons', relatedTargetIds: ['pluto', 'charon', 'newhorizons'], focusTargetId: 'pluto', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/' },
      { id: 'pluto-downlink', date: '2016-10-25', title: '冥王星数据回传完成', narrative: '历经一年多的深空回传，冥王星飞掠记录的最后一批科学数据抵达地球，完整数据集随即进入研究阶段。', craftId: 'newhorizons', relatedTargetIds: ['pluto', 'newhorizons'], focusTargetId: 'newhorizons', sourceUrl: 'https://www.nasa.gov/news-release/nasas-new-horizons-completes-pluto-flyby-data-transmission/' },
      { id: 'arrokoth', date: '2019-01-01', title: '邂逅阿罗科斯', narrative: '它飞掠柯伊伯带天体阿罗科斯，首次近距离观察到一个保存早期太阳系物质的接触双星。', craftId: 'newhorizons', relatedTargetIds: ['arrokoth', 'newhorizons'], focusTargetId: 'newhorizons', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/' },
    ],
  },
]

export function getMissionStoryEvent(storyId: string, eventId: string): MissionStoryEvent | null {
  return MISSION_STORIES.find((story) => story.id === storyId)?.events.find((event) => event.id === eventId) ?? null
}

/** Returns the historical timeline owned by a spacecraft archive, if one exists. */
export function getMissionStoryForCraft(craftId: string): MissionStory | null {
  return MISSION_STORIES.find((story) => story.craftId === craftId) ?? null
}
