/**
 * Official NASA 3D Resources models bundled with the app (public/models/).
 * Source: https://science.nasa.gov/3d-resources/ — free to use with
 * attribution; usage must not imply NASA endorsement.
 *
 * Tiangong has no official NASA model (and third-party licensing is unclear),
 * so it intentionally stays on the procedural model.
 */
export type CraftModelInfo = {
  url: string
  /** Attribution shown in the archive panel. */
  credit: string
  creditUrl: string
  /** Extra yaw applied so the craft "faces" the preview camera nicely. */
  previewYaw?: number
}

const NASA_3D = 'NASA 3D Resources'
const NASA_3D_URL = 'https://science.nasa.gov/3d-resources/'

export const CRAFT_MODELS: Record<string, CraftModelInfo> = {
  voyager1: { url: '/models/voyager.glb', credit: `${NASA_3D} · Voyager Probe (B)`, creditUrl: NASA_3D_URL },
  voyager2: { url: '/models/voyager.glb', credit: `${NASA_3D} · Voyager Probe (B)`, creditUrl: NASA_3D_URL },
  pioneer10: { url: '/models/pioneer10.glb', credit: `${NASA_3D} · Pioneer 10`, creditUrl: NASA_3D_URL },
  newhorizons: { url: '/models/newhorizons.glb', credit: `${NASA_3D} · New Horizons`, creditUrl: NASA_3D_URL },
  parker: { url: '/models/parker.glb', credit: `${NASA_3D} · Parker Solar Probe`, creditUrl: NASA_3D_URL },
  jwst: { url: '/models/jwst.glb', credit: `${NASA_3D} · James Webb Space Telescope (B)`, creditUrl: NASA_3D_URL },
  juno: { url: '/models/juno.glb', credit: `${NASA_3D} · Juno (B)`, creditUrl: NASA_3D_URL },
  hubble: { url: '/models/hubble.glb', credit: `${NASA_3D} · Hubble Space Telescope (A)`, creditUrl: NASA_3D_URL },
  iss: { url: '/models/iss.glb', credit: `${NASA_3D} · ISS (B)`, creditUrl: NASA_3D_URL },
}

export function getCraftModel(craftId: string): CraftModelInfo | null {
  return CRAFT_MODELS[craftId] ?? null
}
