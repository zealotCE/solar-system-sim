import { MINOR_BODIES } from '../data/minorBodies'
import { PLANETS, SUN } from '../data/planets'
import { SPACECRAFT } from '../data/spacecraft'

export type ArchiveRouteKind = 'objects' | 'missions'

export type ArchiveRouteEntry = {
  id: string
  kind: ArchiveRouteKind
  path: string
  name: string
  englishName: string
  category: string
  categoryEn: string
  description: string
  descriptionEn: string
  sourceUrl?: string
}

function routePath(kind: ArchiveRouteKind, id: string): string {
  return `/${kind}/${encodeURIComponent(id)}`
}

export const ARCHIVE_ROUTE_ENTRIES: ArchiveRouteEntry[] = [
  {
    id: SUN.id,
    kind: 'objects',
    path: routePath('objects', SUN.id),
    name: SUN.name,
    englishName: SUN.englishName,
    category: '恒星',
    categoryEn: 'STAR',
    description: SUN.description,
    descriptionEn: SUN.descriptionEn,
  },
  ...PLANETS.flatMap<ArchiveRouteEntry>((planet) => [
    {
      id: planet.id,
      kind: 'objects',
      path: routePath('objects', planet.id),
      name: planet.name,
      englishName: planet.englishName,
      category: planet.dwarf ? '矮行星' : '行星',
      categoryEn: planet.dwarf ? 'DWARF PLANET' : 'PLANET',
      description: planet.description,
      descriptionEn: planet.descriptionEn,
    },
    ...planet.moons.map<ArchiveRouteEntry>((moon) => ({
      id: moon.id,
      kind: 'objects',
      path: routePath('objects', moon.id),
      name: moon.name,
      englishName: moon.englishName,
      category: `${planet.name}的天然卫星`,
      categoryEn: `NATURAL SATELLITE OF ${planet.englishName.toUpperCase()}`,
      description: moon.description,
      descriptionEn: `${moon.englishName} is a natural satellite of ${planet.englishName}. Open its archive in the interactive Solar System observatory to inspect its orbit, scale, and current modeled position.`,
    })),
  ]),
  ...MINOR_BODIES.map<ArchiveRouteEntry>((body) => ({
    id: body.id,
    kind: 'objects',
    path: routePath('objects', body.id),
    name: body.name,
    englishName: body.englishName,
    category: body.classification,
    categoryEn: body.classificationEn,
    description: body.description,
    descriptionEn: body.descriptionEn,
    sourceUrl: body.sourceUrl,
  })),
  ...SPACECRAFT.map<ArchiveRouteEntry>((craft) => ({
    id: craft.id,
    kind: 'missions',
    path: routePath('missions', craft.id),
    name: craft.name,
    englishName: craft.englishName,
    category: `${craft.agency} · 人造航天器`,
    categoryEn: `${craft.agency} · SPACECRAFT`,
    description: craft.description,
    descriptionEn: craft.descriptionEn,
    sourceUrl: craft.provenance.sourceUrl,
  })),
]

const ARCHIVE_ENTRY_BY_ID = new Map(
  ARCHIVE_ROUTE_ENTRIES.map((entry) => [entry.id, entry]),
)

export function getArchiveRouteEntry(
  targetId: string | null,
): ArchiveRouteEntry | null {
  return targetId ? (ARCHIVE_ENTRY_BY_ID.get(targetId) ?? null) : null
}

export function getArchiveRouteEntryFromPath(
  pathname: string,
): ArchiveRouteEntry | null {
  const match = /^\/(objects|missions)\/([^/]+)\/?$/u.exec(pathname)
  if (!match) return null

  let targetId: string
  try {
    targetId = decodeURIComponent(match[2])
  } catch {
    return null
  }

  const entry = getArchiveRouteEntry(targetId)
  return entry?.kind === match[1] ? entry : null
}
