/** Dependency-free integrity check for the checked-in Horizons trajectory pack. */
import { readFile } from 'node:fs/promises'

const path = new URL('../src/data/horizonsTrajectories.ts', import.meta.url)
const source = await readFile(path, 'utf8')
const match = source.match(/= (\{[\s\S]*\})\n$/)
if (!match) throw new Error('Could not locate HORIZONS_TRAJECTORIES JSON')
const trajectories = JSON.parse(match[1])
// [earliest allowed first JD, latest required last JD]. NH and Pioneer 10
// ephemerides end at 2050-01-01 TDB (JD 2469807.5); Voyagers extend past it.
const required = {
  voyager1: [2443394.5, 2470154.5],
  voyager2: [2443376.5, 2470154.5],
  pioneer10: [2441380.5, 2469776.5],
  newhorizons: [2453755.5, 2469776.5],
}

for (const [id, [earliest, requiredEnd]] of Object.entries(required)) {
  const samples = trajectories[id]
  if (!Array.isArray(samples) || samples.length < 2) throw new Error(`${id}: missing trajectory samples`)
  let previous = -Infinity
  for (const [index, sample] of samples.entries()) {
    if (!Array.isArray(sample) || sample.length !== 7 || !sample.every(Number.isFinite)) {
      throw new Error(`${id}: invalid finite 7-vector at sample ${index}`)
    }
    if (sample[0] <= previous) throw new Error(`${id}: unordered JD at sample ${index}`)
    previous = sample[0]
  }
  if (samples[0][0] > earliest || samples.at(-1)[0] < requiredEnd) {
    throw new Error(`${id}: insufficient coverage (${samples[0][0]}–${samples.at(-1)[0]})`)
  }
  console.log(`${id}: ${samples.length} ordered finite samples, JD ${samples[0][0]}–${samples.at(-1)[0]}`)
}
