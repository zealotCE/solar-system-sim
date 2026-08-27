import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

import { build } from 'esbuild'

const [entry] = process.argv.slice(2)
if (!entry) {
  throw new Error('Usage: node scripts/run-ts-validator.mjs <validator.ts>')
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'solar-system-validator-'))
const outputPath = join(temporaryDirectory, `${basename(entry, '.ts')}.mjs`)

try {
  await build({
    bundle: true,
    entryPoints: [resolve(entry)],
    format: 'esm',
    logLevel: 'info',
    outfile: outputPath,
    platform: 'node',
  })

  const exitCode = await new Promise((resolveExit, reject) => {
    const child = spawn(process.execPath, [outputPath], { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${entry} terminated by ${signal}`))
      } else {
        resolveExit(code ?? 1)
      }
    })
  })

  if (exitCode !== 0) {
    throw new Error(`${entry} exited with status ${exitCode}`)
  }
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true })
}
