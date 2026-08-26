import { readdir, stat } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

const outputDirectory = resolve('dist')
const maxAssetBytes = 25 * 1024 * 1024

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

const largest = assets.reduce((current, asset) => (asset.size > current.size ? asset : current))
console.log(
  `Cloudflare Pages asset check passed: ${assets.length} files; largest ${relative(
    outputDirectory,
    largest.path,
  )} (${(largest.size / 1024 / 1024).toFixed(2)} MiB).`,
)

