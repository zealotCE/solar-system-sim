export type MinorBodyModelInfo = {
  url: string
  credit: string
  creditUrl: string
}

const MODELS: Record<string, MinorBodyModelInfo> = {
  ceres: {
    url: '/models/ceres.glb',
    credit: 'NASA VTAD · Ceres 3D Model',
    creditUrl: 'https://science.nasa.gov/resource/ceres-3d-model/',
  },
  vesta: {
    url: '/models/vesta.glb',
    credit: 'NASA VTAD · Vesta 3D Model',
    creditUrl: 'https://science.nasa.gov/resource/vesta-3d-model/',
  },
  bennu: {
    url: '/models/bennu.glb',
    credit: 'NASA 3D Resources · 1999 RQ36 (Bennu)',
    creditUrl: 'https://science.nasa.gov/3d-resources/1999-rq36-asteroid/',
  },
  '67p': {
    url: '/models/67p.glb',
    credit: 'ESA / Rosetta · 67P Shape Models v2.0',
    creditUrl: 'https://doi.org/10.26007/34vg-8s07',
  },
  apophis: {
    url: '/models/apophis.glb',
    credit: 'NASA PDS · JPL Apophis Radar Shape Model v1.0',
    creditUrl:
      'https://sbnarchive.psi.edu/pds4/non_mission/gbo.ast-apophis.jpl.radar.shape_model_v1.0/',
  },
  arrokoth: {
    url: '/models/arrokoth.glb',
    credit: 'NASA PDS · Porter (2024) Arrokoth Shape Model',
    creditUrl:
      'https://doi.org/10.26007/97r3-1e19',
  },
}

export function getMinorBodyModel(id: string): MinorBodyModelInfo | null {
  return MODELS[id] ?? null
}

