import { createHash } from 'node:crypto'
import {
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const SOURCE_URL =
  'https://assets.science.nasa.gov/content/dam/science/missions/rst/spacecraft-illustrations/Large%20new%20RST_Model_V004.glb'
const SOURCE_SHA256 =
  'a873fc95945ed0992c552c2a97fc6c5cd0bf7f5519df0040d5a299b03bae67ce'
const OUTPUT_PATH = resolve('public/models/roman.glb')
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024

const workDir = await mkdtemp(join(tmpdir(), 'roman-model-'))
const sourcePath = join(workDir, 'roman-source.glb')

try {
  const response = await fetch(SOURCE_URL)
  if (!response.ok) {
    throw new Error(`Roman source download failed: HTTP ${response.status}`)
  }
  await writeFile(sourcePath, Buffer.from(await response.arrayBuffer()))

  const sourceHash = createHash('sha256')
    .update(await readFile(sourcePath))
    .digest('hex')
  if (sourceHash !== SOURCE_SHA256) {
    throw new Error(
      `Roman source hash changed: expected ${SOURCE_SHA256}, received ${sourceHash}`,
    )
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(
    npx,
    [
      '--yes',
      '@gltf-transform/cli@4.4.2',
      'optimize',
      sourcePath,
      OUTPUT_PATH,
      '--compress',
      'meshopt',
      '--meshopt-level',
      'high',
      '--simplify',
      'true',
      '--simplify-ratio',
      '0.25',
      '--simplify-error',
      '0.001',
      '--texture-compress',
      'webp',
      '--texture-size',
      '1024',
      '--palette',
      'false',
    ],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) {
    throw new Error(`Roman optimization failed with exit code ${result.status}`)
  }

  const output = await stat(OUTPUT_PATH)
  if (output.size > MAX_OUTPUT_BYTES) {
    throw new Error(
      `Optimized Roman model is ${(output.size / 1024 / 1024).toFixed(2)} MiB; expected at most 10 MiB`,
    )
  }
  console.log(
    `Roman model optimized: ${(output.size / 1024 / 1024).toFixed(2)} MiB, source SHA-256 ${SOURCE_SHA256}`,
  )
} finally {
  await rm(workDir, { recursive: true, force: true })
}
