/** Dependency-free integrity check for the checked-in Horizons trajectory pack. */
import { readFile } from 'node:fs/promises'

const path = new URL('../src/data/horizonsTrajectories.ts', import.meta.url)
const source = await readFile(path, 'utf8')
const match = source.match(/= (\{[\s\S]*\})\n$/)
if (!match) throw new Error('Could not locate HORIZONS_TRAJECTORIES JSON')
const trajectories = JSON.parse(match[1])
const UNIX_EPOCH_JD = 2440587.5
const toJd = (date) => Date.parse(`${date}T00:00:00Z`) / 86_400_000 + UNIX_EPOCH_JD

// Requested coverage. The final regular sample can precede STOP_TIME by up to
// one 30-day step, so validation allows that documented sampling interval.
const required = {
  voyager1: ['1977-09-08', '2051-01-15'],
  voyager2: ['1977-08-21', '2051-01-15'],
  pioneer10: ['1972-03-04', '2050-01-01'],
  newhorizons: ['2006-01-20', '2050-01-01'],
  cassini: ['1997-10-16', '2017-09-15'],
  galileo: ['1989-10-20', '2003-09-29'],
  dawn: ['2007-09-28', '2043-10-28'],
  rosetta: ['2004-03-03', '2016-10-04'],
  osirisrex: ['2016-09-09', '2030-03-21'],
  lucy: ['2021-10-17', '2033-04-01'],
  psyche: ['2023-10-14', '2029-02-10'],
  europaclipper: ['2024-10-15', '2034-09-02'],
}

for (const [id, [requestedStart, requestedEnd]] of Object.entries(required)) {
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
  if (
    samples[0][0] > toJd(requestedStart) + 1 ||
    samples.at(-1)[0] < toJd(requestedEnd) - 31
  ) {
    throw new Error(`${id}: insufficient coverage (${samples[0][0]}–${samples.at(-1)[0]})`)
  }
  console.log(`${id}: ${samples.length} ordered finite samples, JD ${samples[0][0]}–${samples.at(-1)[0]}`)
}
