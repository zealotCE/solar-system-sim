import { SPACECRAFT } from '../src/data/spacecraft'
import { TARGET_SEQUENCE } from '../src/data/targets'
import {
  ARCHIVE_ROUTE_ENTRIES,
  getArchiveRouteEntry,
  getArchiveRouteEntryFromPath,
} from '../src/lib/archiveRoutes'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const targetIds = new Set(TARGET_SEQUENCE)
const routeIds = new Set(ARCHIVE_ROUTE_ENTRIES.map((entry) => entry.id))
const routePaths = new Set(ARCHIVE_ROUTE_ENTRIES.map((entry) => entry.path))
const spacecraftIds = new Set(SPACECRAFT.map((craft) => craft.id))

assert(
  routeIds.size === ARCHIVE_ROUTE_ENTRIES.length,
  'Archive route ids must be unique.',
)
assert(
  routePaths.size === ARCHIVE_ROUTE_ENTRIES.length,
  'Archive route paths must be unique.',
)
assert(
  routeIds.size === targetIds.size &&
    [...targetIds].every((targetId) => routeIds.has(targetId)),
  'Every selectable target must have exactly one archive route.',
)

for (const entry of ARCHIVE_ROUTE_ENTRIES) {
  const expectedKind = spacecraftIds.has(entry.id) ? 'missions' : 'objects'
  assert(
    entry.kind === expectedKind,
    `${entry.id} should use /${expectedKind}/, received /${entry.kind}/.`,
  )
  assert(
    getArchiveRouteEntry(entry.id) === entry,
    `${entry.id} does not round-trip through the id registry.`,
  )
  assert(
    getArchiveRouteEntryFromPath(entry.path) === entry,
    `${entry.path} does not round-trip through the pathname parser.`,
  )
  assert(
    getArchiveRouteEntryFromPath(`${entry.path}/`) === entry,
    `${entry.path} should also resolve with a trailing slash.`,
  )
}

assert(
  getArchiveRouteEntryFromPath('/objects/not-a-target/') === null,
  'Unknown archive paths must be rejected.',
)
assert(
  getArchiveRouteEntryFromPath('/missions/earth/') === null,
  'Natural bodies must not resolve under /missions/.',
)
assert(
  getArchiveRouteEntryFromPath('/objects/voyager2/') === null,
  'Spacecraft must not resolve under /objects/.',
)

console.log(
  `Archive route validation passed: ${ARCHIVE_ROUTE_ENTRIES.length} targets.`,
)
