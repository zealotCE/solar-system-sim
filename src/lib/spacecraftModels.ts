import { utcMsToSimTime } from './utils'

/**
 * Official NASA 3D Resources models bundled with the app (public/models/).
 * Source: https://science.nasa.gov/3d-resources/ — free to use with
 * attribution; usage must not imply NASA endorsement.
 *
 * Tiangong has no redistributable official mesh. Its bundled asset is a
 * project-authored reconstruction based on public CMSA configuration imagery.
 */
export type CraftModelInfo = {
  url: string
  /** Attribution shown in the archive panel. */
  credit: string
  creditUrl: string
  /** Extra yaw applied so the craft "faces" the preview camera nicely. */
  previewYaw?: number
  /** Extra pitch for broad, planar craft authored edge-on to the camera. */
  previewPitch?: number
}

export type CraftModelVariant = 'current' | 'planned'
export type TiangongModelMode = 'auto' | CraftModelVariant

/**
 * Scenario threshold, not an announced launch date. Official reporting only
 * establishes that Xuntian precedes the first expansion module; 2028 provides
 * a useful clearly-labelled future-planning view in the time machine.
 */
export const TIANGONG_CROSS_SCENARIO_DATE = '2028-01-01'
export const TIANGONG_CROSS_SCENARIO_SIM_TIME = utcMsToSimTime(
  Date.UTC(2028, 0, 1),
)

export function resolveTiangongModelVariant(
  simTime: number,
  mode: TiangongModelMode,
): CraftModelVariant {
  if (mode !== 'auto') return mode
  return simTime >= TIANGONG_CROSS_SCENARIO_SIM_TIME
    ? 'planned'
    : 'current'
}

const NASA_3D = 'NASA 3D Resources'
const NASA_3D_URL = 'https://science.nasa.gov/3d-resources/'

export const CRAFT_MODELS: Record<string, CraftModelInfo> = {
  voyager1: { url: '/models/voyager.glb', credit: `${NASA_3D} · Voyager Probe (B)`, creditUrl: NASA_3D_URL },
  voyager2: { url: '/models/voyager.glb', credit: `${NASA_3D} · Voyager Probe (B)`, creditUrl: NASA_3D_URL },
  pioneer10: { url: '/models/pioneer10.glb', credit: `${NASA_3D} · Pioneer 10`, creditUrl: NASA_3D_URL },
  newhorizons: { url: '/models/newhorizons.glb', credit: `${NASA_3D} · New Horizons`, creditUrl: NASA_3D_URL },
  cassini: { url: '/models/cassini.glb', credit: `${NASA_3D} · Cassini-Huygens (B)`, creditUrl: 'https://science.nasa.gov/3d-resources/cassini-huygens-b/' },
  galileo: { url: '/models/galileo.glb', credit: `${NASA_3D} · Galileo`, creditUrl: 'https://science.nasa.gov/3d-resources/galileo/' },
  dawn: { url: '/models/dawn.glb', credit: `${NASA_3D} · Dawn`, creditUrl: 'https://science.nasa.gov/3d-resources/dawn/' },
  rosetta: { url: '/models/rosetta.glb', credit: `${NASA_3D} · Rosetta`, creditUrl: 'https://science.nasa.gov/3d-resources/rosetta/' },
  osirisrex: { url: '/models/osiris-rex.glb', credit: `${NASA_3D} · OSIRIS-REx`, creditUrl: 'https://science.nasa.gov/3d-resources/origins-spectral-interpretation-resource-identification-and-security-regolith-explorer-osiris-rex/' },
  europaclipper: {
    url: '/models/europa-clipper-meshopt.glb',
    credit: `${NASA_3D} · Europa Clipper (web-optimized derivative)`,
    creditUrl: 'https://science.nasa.gov/missions/europa-clipper/europa-clipper-resources/europa-clipper-downloadable-3d-model/',
  },
  parker: { url: '/models/parker.glb', credit: `${NASA_3D} · Parker Solar Probe`, creditUrl: NASA_3D_URL },
  jwst: { url: '/models/jwst.glb', credit: `${NASA_3D} · James Webb Space Telescope (B)`, creditUrl: NASA_3D_URL },
  roman: {
    url: '/models/roman.glb',
    credit: `${NASA_3D} · Roman completed-observatory model (web-optimized derivative)`,
    creditUrl: 'https://science.nasa.gov/missions/roman-space-telescope/building-roman/',
    previewYaw: -0.35,
    previewPitch: -0.5,
  },
  tiangong: {
    url: '/models/tiangong.glb',
    credit: 'Project-authored 2026 Tiangong T-configuration · CMSA/CNSA references',
    creditUrl: 'https://www.cmse.gov.cn/dmt/tj/sz15/202302/t20230221_52741.html',
    previewYaw: 0.15,
    previewPitch: 0.62,
  },
  'tiangong-planned': {
    url: '/models/tiangong-cross.glb',
    credit:
      'Project-authored planned Tiangong cross configuration · announced 20-tonne expansion module',
    creditUrl:
      'https://english.news.cn/20260623/6b7214cefeb147bea229e5a4820309b4/c.html',
    previewYaw: 0.15,
    previewPitch: 0.36,
  },
  juno: { url: '/models/juno.glb', credit: `${NASA_3D} · Juno (B)`, creditUrl: NASA_3D_URL },
  hubble: { url: '/models/hubble.glb', credit: `${NASA_3D} · Hubble Space Telescope (A)`, creditUrl: NASA_3D_URL },
  iss: { url: '/models/iss.glb', credit: `${NASA_3D} · ISS (B)`, creditUrl: NASA_3D_URL },
}

export function getCraftModel(
  craftId: string,
  variant: CraftModelVariant = 'current',
): CraftModelInfo | null {
  const modelId =
    craftId === 'tiangong' && variant === 'planned'
      ? 'tiangong-planned'
      : craftId
  return CRAFT_MODELS[modelId] ?? null
}
