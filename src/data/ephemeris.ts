/**
 * Planetary positions from JPL's "Keplerian Elements for Approximate Positions
 * of the Major Planets" (E.M. Standish, Table 1), valid 1800 AD – 2050 AD.
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *
 * Elements are mean ecliptic and equinox of J2000; rates are per Julian
 * century. Worst-case error inside the validity interval is well under 1
 * arcminute in longitude for the classical planets and ~0.1° for Pluto —
 * far below one on-screen pixel at this simulator's scales.
 */

/** Simulation epoch: 2026-01-01 00:00 TDB, matching the Horizons pack. */
export const SIM_EPOCH_JD_TDB = 2461041.5
export const J2000_JD = 2451545.0
export const DAYS_PER_YEAR = 365.25

export function simTimeToJd(simTimeYears: number): number {
  return SIM_EPOCH_JD_TDB + simTimeYears * DAYS_PER_YEAR
}

const DEG = Math.PI / 180
/** Mean obliquity of the ecliptic at J2000 (IAU 2006), degrees. */
const OBLIQUITY_J2000 = 23.43928 * DEG
const COS_EPS = Math.cos(OBLIQUITY_J2000)
const SIN_EPS = Math.sin(OBLIQUITY_J2000)

/**
 * [a (AU), aDot, e, eDot, I (deg), IDot, L (deg), LDot, varpi (deg), varpiDot,
 *  Omega (deg), OmegaDot] — value at J2000 plus rate per Julian century.
 * "earth" uses the Earth–Moon barycenter row (offset from Earth's center is
 * below 5000 km, invisible at scene scale).
 */
const TABLE1: Record<string, readonly number[]> = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.2503235, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus: [0.72333566, 0.0000039, 0.00677672, -0.00004107, 3.39467605, -0.0007889, 181.9790995, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
  mars: [1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.202887, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn: [9.53667594, -0.0012506, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
  uranus: [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.9542763, 0.40805281, 74.01692503, 0.04240589],
  neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
  pluto: [39.48211675, -0.00031596, 0.2488273, 0.0000517, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482],
}

function normalizeDeg(value: number): number {
  const wrapped = value % 360
  return wrapped < -180 ? wrapped + 360 : wrapped >= 180 ? wrapped - 360 : wrapped
}

/**
 * Heliocentric position in the J2000 mean-ecliptic frame, in AU.
 * +X toward the vernal equinox, +Z toward the north ecliptic pole.
 */
export function getPlanetEclipticAu(planetId: string, jdTdb: number): [number, number, number] {
  const row = TABLE1[planetId]
  if (!row) return [0, 0, 0]
  const centuries = (jdTdb - J2000_JD) / 36525

  const a = row[0] + row[1] * centuries
  const e = row[2] + row[3] * centuries
  const inclination = (row[4] + row[5] * centuries) * DEG
  const meanLongitude = row[6] + row[7] * centuries
  const perihelionLongitude = row[8] + row[9] * centuries
  const nodeLongitude = (row[10] + row[11] * centuries) * DEG

  const argPerihelion = perihelionLongitude * DEG - nodeLongitude
  const meanAnomaly = normalizeDeg(meanLongitude - perihelionLongitude) * DEG

  // Kepler's equation, Newton iterations (converges fast even for Pluto e≈0.25).
  let eccentricAnomaly = meanAnomaly + e * Math.sin(meanAnomaly)
  for (let i = 0; i < 8; i++) {
    const delta =
      (eccentricAnomaly - e * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - e * Math.cos(eccentricAnomaly))
    eccentricAnomaly -= delta
    if (Math.abs(delta) < 1e-9) break
  }

  const xOrb = a * (Math.cos(eccentricAnomaly) - e)
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly)

  const cosW = Math.cos(argPerihelion)
  const sinW = Math.sin(argPerihelion)
  const cosO = Math.cos(nodeLongitude)
  const sinO = Math.sin(nodeLongitude)
  const cosI = Math.cos(inclination)
  const sinI = Math.sin(inclination)

  return [
    (cosW * cosO - sinW * sinO * cosI) * xOrb + (-sinW * cosO - cosW * sinO * cosI) * yOrb,
    (cosW * sinO + sinW * cosO * cosI) * xOrb + (-sinW * sinO + cosW * cosO * cosI) * yOrb,
    sinW * sinI * xOrb + cosW * sinI * yOrb,
  ]
}

/** Rotates a Sun-centered ICRF/equatorial vector into the J2000 ecliptic frame. */
export function icrfToEclipticAu(x: number, y: number, z: number): [number, number, number] {
  return [x, COS_EPS * y + SIN_EPS * z, -SIN_EPS * y + COS_EPS * z]
}
