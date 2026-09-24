import { readFile, readdir, stat } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

const outputDirectory = resolve('dist')
const maxAssetBytes = 25 * 1024 * 1024
const maxMainJavaScriptBytes = 3 * 1024 * 1024

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name)
      return entry.isDirectory() ? collectFiles(path) : [path]
    }),
  )
  return nested.flat()
}

let files
try {
  files = await collectFiles(outputDirectory)
} catch (error) {
  if (error?.code === 'ENOENT') {
    throw new Error('dist/ does not exist; run npm run build first.')
  }
  throw error
}

const assets = await Promise.all(
  files.map(async (path) => ({ path, size: (await stat(path)).size })),
)
const oversized = assets.filter(({ size }) => size > maxAssetBytes)

if (oversized.length) {
  const details = oversized
    .map(({ path, size }) => `${relative(outputDirectory, path)} (${(size / 1024 / 1024).toFixed(2)} MiB)`)
    .join('\n')
  throw new Error(`Cloudflare Pages rejects assets over 25 MiB:\n${details}`)
}

const indexHtml = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')
const moduleScriptTags = [...indexHtml.matchAll(/<script\b[^>]*>/giu)]
  .map(([tag]) => tag)
  .filter((tag) => /\btype\s*=\s*(['"])module\1/iu.test(tag))
const mainScriptSources = moduleScriptTags
  .map((tag) => tag.match(/\bsrc\s*=\s*(['"])(.*?)\1/iu)?.[2])
  .filter((source) => source?.endsWith('.js'))

if (mainScriptSources.length !== 1) {
  throw new Error(
    `Expected one module entry in dist/index.html, found ${mainScriptSources.length}.`,
  )
}

const mainRelativePath = new URL(mainScriptSources[0], 'https://build.invalid/').pathname.replace(
  /^\/+/u,
  '',
)
const mainJavaScript = assets.find(
  ({ path }) => relative(outputDirectory, path) === mainRelativePath,
)

if (!mainJavaScript) {
  throw new Error(`Main JavaScript asset is missing from dist/: ${mainRelativePath}`)
}
if (mainJavaScript.size > maxMainJavaScriptBytes) {
  throw new Error(
    `Main JavaScript exceeds the ${(maxMainJavaScriptBytes / 1024 / 1024).toFixed(
      2,
    )} MiB startup budget: ${mainRelativePath} (${(
      mainJavaScript.size /
      1024 /
      1024
    ).toFixed(2)} MiB). Keep ephemerides out of the startup bundle.`,
  )
}

const archiveManifestPath = resolve(outputDirectory, 'archive-routes.json')
const archiveRoutes = JSON.parse(await readFile(archiveManifestPath, 'utf8'))
if (!Array.isArray(archiveRoutes) || !archiveRoutes.length) {
  throw new Error('dist/archive-routes.json contains no static archive routes.')
}

const siteOrigin = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/u, '') ?? ''
const robotsTxt = await readFile(resolve(outputDirectory, 'robots.txt'), 'utf8').catch(
  () => {
    throw new Error('dist/robots.txt is missing; the archive generator must emit it.')
  },
)
if (!/^User-agent: \*$/mu.test(robotsTxt) || !/^Allow: \/$/mu.test(robotsTxt)) {
  throw new Error('dist/robots.txt must allow all crawlers.')
}
const sitemapPath = resolve(outputDirectory, 'sitemap.xml')
const sitemapXml = await readFile(sitemapPath, 'utf8').catch(() => null)
if (siteOrigin) {
  if (!sitemapXml) {
    throw new Error('PUBLIC_SITE_URL is set but dist/sitemap.xml is missing.')
  }
  if (!robotsTxt.includes(`Sitemap: ${siteOrigin}/sitemap.xml`)) {
    throw new Error('dist/robots.txt does not reference the absolute sitemap URL.')
  }
  const sitemapLocations = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/gu)].map(
    ([, location]) => location,
  )
  const expectedLocations = ['/', ...archiveRoutes.map((route) => route.path)].map(
    (path) => `${siteOrigin}${path}`,
  )
  if (
    sitemapLocations.length !== expectedLocations.length ||
    expectedLocations.some((location) => !sitemapLocations.includes(location))
  ) {
    throw new Error(
      `dist/sitemap.xml must list / and all ${archiveRoutes.length} archive routes as absolute URLs.`,
    )
  }
} else if (sitemapXml !== null || /^Sitemap:/mu.test(robotsTxt)) {
  throw new Error(
    'Without PUBLIC_SITE_URL no sitemap may be emitted: sitemap URLs must be absolute.',
  )
}

const archiveIds = new Set()
const archivePaths = new Set()
for (const route of archiveRoutes) {
  if (
    typeof route?.id !== 'string' ||
    typeof route?.kind !== 'string' ||
    typeof route?.path !== 'string' ||
    !/^\/(objects|missions)\/[a-z0-9-]+$/u.test(route.path)
  ) {
    throw new Error(`Invalid static archive route: ${JSON.stringify(route)}`)
  }
  if (archiveIds.has(route.id) || archivePaths.has(route.path)) {
    throw new Error(`Duplicate static archive route: ${route.id} (${route.path})`)
  }
  archiveIds.add(route.id)
  archivePaths.add(route.path)

  const archivePagePath = resolve(
    outputDirectory,
    `${route.path.replace(/^\//u, '')}.html`,
  )
  const archivePageHtml = await readFile(archivePagePath, 'utf8')
  if (
    !archivePageHtml.includes('data-static-archive-entry') ||
    !archivePageHtml.includes('data-archive-canonical') ||
    !archivePageHtml.includes(mainScriptSources[0])
  ) {
    throw new Error(`Static archive page is incomplete: ${route.path}`)
  }
  const expectedCanonical = `${siteOrigin}${route.path}`
  if (
    !archivePageHtml.includes(`rel="canonical" href="${expectedCanonical}"`) ||
    !archivePageHtml.includes('<meta name="twitter:card" content="summary" />') ||
    archivePageHtml.includes('property="og:url"') !== Boolean(siteOrigin) ||
    (siteOrigin &&
      !archivePageHtml.includes(`<meta property="og:url" content="${expectedCanonical}" />`))
  ) {
    throw new Error(`Static archive page has inconsistent canonical/social metadata: ${route.path}`)
  }
  if (!indexHtml.includes(`href="${route.path}"`)) {
    throw new Error(`Root static catalog does not link to ${route.path}`)
  }
}

// Without a top-level 404.html, Cloudflare Pages switches to SPA mode and
// answers every unknown path, including missing GLB files, with index.html.
const notFoundHtml = await readFile(resolve(outputDirectory, '404.html'), 'utf8').catch(() => {
  throw new Error(
    'dist/404.html is missing; Cloudflare Pages would serve index.html for unknown paths.',
  )
})
if (
  !notFoundHtml.includes('<meta name="robots" content="noindex" />') ||
  /<script\b/iu.test(notFoundHtml)
) {
  throw new Error('dist/404.html must be a static noindex page without scripts.')
}

const mainJavaScriptSource = await readFile(mainJavaScript.path, 'utf8')
const ephemerisAssets = assets.filter(({ path }) => {
  const outputPath = relative(outputDirectory, path)
  return outputPath.startsWith('ephemerides/') && outputPath.endsWith('.json')
})
if (!ephemerisAssets.length) {
  throw new Error('No hashed ephemeris assets were copied to dist/ephemerides/.')
}

const embeddedTrajectoryFingerprints = []
for (const { path } of ephemerisAssets) {
  const asset = JSON.parse(await readFile(path, 'utf8'))
  const sampleIndexes = [0, Math.floor(asset.samples.length / 2), asset.samples.length - 1]
  const fingerprints = sampleIndexes.flatMap((sampleIndex) =>
    asset.samples[sampleIndex]
      .slice(1, 4)
      .map((value) => Math.abs(value).toFixed(16).split('.')[1]?.slice(0, 13))
      .filter((value) => value && !/^0+$/u.test(value)),
  )
  if (fingerprints.some((fingerprint) => mainJavaScriptSource.includes(fingerprint))) {
    embeddedTrajectoryFingerprints.push(relative(outputDirectory, path))
  }
}
if (embeddedTrajectoryFingerprints.length) {
  throw new Error(
    `Main JavaScript contains trajectory sample fingerprints from:\n${embeddedTrajectoryFingerprints.join(
      '\n',
    )}`,
  )
}

const largest = assets.reduce((current, asset) => (asset.size > current.size ? asset : current))
console.log(
  `Cloudflare Pages asset check passed: ${assets.length} files; largest ${relative(
    outputDirectory,
    largest.path,
  )} (${(largest.size / 1024 / 1024).toFixed(2)} MiB); main JavaScript ${mainRelativePath} (${(
    mainJavaScript.size /
    1024 /
    1024
  ).toFixed(2)} MiB); ${archiveRoutes.length} static archive routes${
    siteOrigin ? ' plus sitemap.xml' : ' (no sitemap: PUBLIC_SITE_URL unset)'
  }; ${ephemerisAssets.length} ephemeris assets remain external with no sample fingerprints in the entry bundle.`,
)

