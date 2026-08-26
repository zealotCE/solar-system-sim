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
}

export function getMinorBodyModel(id: string): MinorBodyModelInfo | null {
  return MODELS[id] ?? null
}

