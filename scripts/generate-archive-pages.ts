import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import {
  ARCHIVE_ROUTE_ENTRIES,
  type ArchiveRouteEntry,
} from '../src/lib/archiveRoutes'

const outputDirectory = resolve('dist')
const templatePath = resolve(outputDirectory, 'index.html')
const rootMarker = '<div id="root"></div>'
const siteOrigin = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/u, '') ?? ''
if (siteOrigin && !/^https?:\/\/[^/\s]+(?:\/[^\s]*)?$/u.test(siteOrigin)) {
  throw new Error(
    `PUBLIC_SITE_URL must be an absolute http(s) URL, received ${JSON.stringify(siteOrigin)}.`,
  )
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function canonicalUrl(path: string): string {
  return siteOrigin ? `${siteOrigin}${path}` : path
}

function replaceDocumentMetadata(
  template: string,
  entry: ArchiveRouteEntry,
): string {
  const title = `${entry.name} · ${entry.englishName} | 太阳系动态观测台`
  const canonical = canonicalUrl(entry.path)
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: entry.englishName,
    alternateName: entry.name,
    description: entry.descriptionEn,
    url: canonical,
    ...(entry.sourceUrl ? { sameAs: entry.sourceUrl } : {}),
  }).replaceAll('<', '\\u003c')

  return template
    .replace('<html lang="zh-CN">', '<html lang="zh-CN" data-archive-entry>')
    .replace(
      /<meta name="description" content="[^"]*" \/>/u,
      `<meta name="description" content="${escapeHtml(entry.description)}" />`,
    )
    .replace(/<title>.*?<\/title>/u, `<title>${escapeHtml(title)}</title>`)
    .replace(
      '</head>',
      `    <meta name="robots" content="index,follow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(entry.description)}" />
${siteOrigin ? `    <meta property="og:url" content="${escapeHtml(canonical)}" />\n` : ''}    <meta name="twitter:card" content="summary" />
    <link data-archive-canonical rel="canonical" href="${escapeHtml(canonical)}" />
    <script type="application/ld+json">${jsonLd}</script>
  </head>`,
    )
}

function renderStaticEntry(entry: ArchiveRouteEntry): string {
  const sourceLink = entry.sourceUrl
    ? `<a href="${escapeHtml(entry.sourceUrl)}" rel="external">资料来源 · Source</a>`
    : ''

  return `<article data-static-archive-entry style="box-sizing:border-box;min-height:100vh;padding:clamp(2rem,8vw,6rem);background:#02060f;color:#dbeafe;font-family:system-ui,sans-serif">
      <p style="margin:0 0 1rem;color:#67e8f9;font-size:.75rem;letter-spacing:.14em">${escapeHtml(entry.category)} · ${escapeHtml(entry.categoryEn)}</p>
      <h1 style="margin:0;max-width:60rem;font-size:clamp(2rem,6vw,4.5rem);line-height:1.08">${escapeHtml(entry.name)} <span lang="en" style="color:#94a3b8">${escapeHtml(entry.englishName)}</span></h1>
      <p style="max-width:52rem;margin:2rem 0 0;line-height:1.8;color:#cbd5e1">${escapeHtml(entry.description)}</p>
      <p lang="en" style="max-width:52rem;margin:1rem 0 0;line-height:1.8;color:#94a3b8">${escapeHtml(entry.descriptionEn)}</p>
      <p style="display:flex;gap:1.5rem;margin:2rem 0 0">
        <a href="/#target=${encodeURIComponent(entry.id)}" style="color:#67e8f9">太阳系总览 · Solar System</a>
        ${sourceLink}
      </p>
    </article>`
}

function renderStaticCatalog(): string {
  const groups = [
    {
      heading: '天体 · Celestial objects',
      entries: ARCHIVE_ROUTE_ENTRIES.filter((entry) => entry.kind === 'objects'),
    },
    {
      heading: '航天任务 · Space missions',
      entries: ARCHIVE_ROUTE_ENTRIES.filter((entry) => entry.kind === 'missions'),
    },
  ]

  const groupHtml = groups
    .map(
      ({ heading, entries }) => `<section>
        <h2>${heading}</h2>
        <ul>${entries
          .map(
            (entry) =>
              `<li><a href="${escapeHtml(entry.path)}">${escapeHtml(entry.name)} · ${escapeHtml(entry.englishName)}</a></li>`,
          )
          .join('')}</ul>
      </section>`,
    )
    .join('')

  return `<main data-static-archive-catalog style="box-sizing:border-box;min-height:100vh;padding:clamp(2rem,8vw,6rem);background:#02060f;color:#dbeafe;font-family:system-ui,sans-serif">
      <h1>太阳系动态观测台 · Solar System Observatory</h1>
      <p>交互式三维太阳系、历史星历与任务档案。</p>
      <details style="margin-top:2rem;color:#94a3b8">
        <summary>浏览静态档案 · Browse archive</summary>
        <nav aria-label="目标档案">${groupHtml}</nav>
      </details>
    </main>`
}

const template = await readFile(templatePath, 'utf8')
if (!template.includes(rootMarker)) {
  throw new Error(`Expected ${rootMarker} in ${templatePath}`)
}

for (const entry of ARCHIVE_ROUTE_ENTRIES) {
  const outputPath = resolve(
    outputDirectory,
    `${entry.path.replace(/^\//u, '')}.html`,
  )
  const html = replaceDocumentMetadata(template, entry).replace(
    rootMarker,
    `<div id="root">${renderStaticEntry(entry)}</div>`,
  )
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, html)
}

const rootCanonical = canonicalUrl('/')
const rootHtml = template
  .replace(
    '</head>',
    `    <link data-archive-canonical rel="canonical" href="${escapeHtml(rootCanonical)}" />
  </head>`,
  )
  .replace(
    rootMarker,
    `<div id="root"></div>
    <noscript>${renderStaticCatalog()}</noscript>`,
  )
await writeFile(templatePath, rootHtml)

await writeFile(
  resolve(outputDirectory, 'archive-routes.json'),
  `${JSON.stringify(
    ARCHIVE_ROUTE_ENTRIES.map(({ id, kind, path }) => ({ id, kind, path })),
    null,
    2,
  )}\n`,
)

// The sitemap protocol requires absolute URLs, so it is only emitted when the
// deployment origin is known. robots.txt is always emitted.
const robotsLines = ['User-agent: *', 'Allow: /']
if (siteOrigin) {
  const sitemapUrls = ['/', ...ARCHIVE_ROUTE_ENTRIES.map((entry) => entry.path)]
  await writeFile(
    resolve(outputDirectory, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map((path) => `  <url><loc>${escapeHtml(canonicalUrl(path))}</loc></url>`)
  .join('\n')}
</urlset>
`,
  )
  robotsLines.push('', `Sitemap: ${siteOrigin}/sitemap.xml`)
} else {
  console.warn(
    'PUBLIC_SITE_URL is not set: skipped dist/sitemap.xml (sitemaps need absolute URLs); robots.txt has no Sitemap line and canonicals stay relative.',
  )
}
await writeFile(resolve(outputDirectory, 'robots.txt'), `${robotsLines.join('\n')}\n`)

console.log(
  `Generated ${ARCHIVE_ROUTE_ENTRIES.length} static archive pages in dist/${
    siteOrigin ? ' with sitemap.xml' : ''
  }.`,
)
