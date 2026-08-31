import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

class NodeFileReader {
  result = null
  onloadend = null
  onerror = null

  readAsArrayBuffer(blob) {
    void blob
      .arrayBuffer()
      .then((result) => {
        this.result = result
        this.onloadend?.()
      })
      .catch((error) => {
        this.onerror?.(error)
      })
  }
}

globalThis.FileReader = NodeFileReader

const CURRENT_OUTPUT_PATH = resolve('public/models/tiangong.glb')
const PLANNED_OUTPUT_PATH = resolve('public/models/tiangong-cross.glb')
const workDir = await mkdtemp(join(tmpdir(), 'tiangong-model-'))
let root = new THREE.Group()
root.name = 'Tiangong'
root.userData.provenance =
  'Project-authored 2026 T-configuration reconstruction based on public CMSA/CNSA dimensions and imagery; includes representative Shenzhou-23 and Tianzhou-10 visiting vehicles and is not an official engineering mesh.'

const materials = {
  hull: new THREE.MeshStandardMaterial({
    color: '#cbd3d8',
    metalness: 0.62,
    roughness: 0.38,
  }),
  whiteMli: new THREE.MeshStandardMaterial({
    color: '#e8eceb',
    metalness: 0.24,
    roughness: 0.68,
  }),
  darkMli: new THREE.MeshStandardMaterial({
    color: '#293139',
    metalness: 0.56,
    roughness: 0.46,
  }),
  goldMli: new THREE.MeshStandardMaterial({
    color: '#b68b37',
    metalness: 0.72,
    roughness: 0.42,
  }),
  docking: new THREE.MeshStandardMaterial({
    color: '#6f7c84',
    metalness: 0.78,
    roughness: 0.31,
  }),
  solar: new THREE.MeshStandardMaterial({
    color: '#963f20',
    metalness: 0.2,
    roughness: 0.48,
    side: THREE.DoubleSide,
  }),
  solarGrid: new THREE.MeshStandardMaterial({
    color: '#211d1b',
    metalness: 0.3,
    roughness: 0.54,
  }),
  solarFrame: new THREE.MeshStandardMaterial({
    color: '#aab4ba',
    metalness: 0.76,
    roughness: 0.3,
  }),
  smallSolar: new THREE.MeshStandardMaterial({
    color: '#183253',
    metalness: 0.28,
    roughness: 0.5,
    side: THREE.DoubleSide,
  }),
  radiator: new THREE.MeshStandardMaterial({
    color: '#d9dde0',
    metalness: 0.32,
    roughness: 0.6,
  }),
  window: new THREE.MeshStandardMaterial({
    color: '#111a22',
    metalness: 0.58,
    roughness: 0.22,
  }),
  flag: new THREE.MeshStandardMaterial({
    color: '#d62828',
    metalness: 0.08,
    roughness: 0.68,
  }),
}

function addMesh(name, geometry, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  root.add(mesh)
  return mesh
}

function axisRotation(axis) {
  if (axis === 'x') return [0, 0, Math.PI / 2]
  if (axis === 'z') return [Math.PI / 2, 0, 0]
  return [0, 0, 0]
}

function addCylinder(
  name,
  length,
  radius,
  position,
  material = materials.hull,
  axis = 'x',
  radialSegments = 32,
) {
  return addMesh(
    name,
    new THREE.CylinderGeometry(radius, radius, length, radialSegments),
    material,
    position,
    axisRotation(axis),
  )
}

function addRing(name, radius, position, axis = 'x', tube = 0.1) {
  const rotation =
    axis === 'x' ? [0, Math.PI / 2, 0] : axis === 'y' ? [Math.PI / 2, 0, 0] : [0, 0, 0]
  return addMesh(
    name,
    new THREE.TorusGeometry(radius, tube, 8, 32),
    materials.docking,
    position,
    rotation,
  )
}

function addModule({
  name,
  length,
  radius,
  position,
  axis,
  material = materials.whiteMli,
  radialSegments = 24,
}) {
  addCylinder(name, length, radius, position, material, axis, radialSegments)
  const direction =
    axis === 'x' ? [1, 0, 0] : axis === 'y' ? [0, 1, 0] : [0, 0, 1]
  for (const fraction of [-0.34, 0, 0.34]) {
    addRing(
      `${name}-MLI-band-${fraction}`,
      radius * 1.015,
      [
        position[0] + direction[0] * length * fraction,
        position[1] + direction[1] * length * fraction,
        position[2] + direction[2] * length * fraction,
      ],
      axis,
      0.055,
    )
  }
}

function addDockingPort(name, position, axis = 'x') {
  addCylinder(
    `${name}-collar`,
    0.62,
    0.72,
    position,
    materials.docking,
    axis,
    28,
  )
  addRing(`${name}-ring`, 0.63, position, axis, 0.09)
}

function addSolarWing(name, anchor, direction, length = 23.5, width = 5.85) {
  // Public dimensions describe 27 m from rotary joint to tip and 138 m² of
  // active blanket per wing. Removing the rotary boom leaves a roughly
  // 23.5 × 5.85 m twin-blanket plane.
  const boomLength = 3.5
  const centerY = anchor[1] + direction * (length / 2 + boomLength)
  const centerGap = 0.72
  const panelWidth = (width - centerGap) / 2
  const panelOffset = (panelWidth + centerGap) / 2
  for (const offset of [-panelOffset, panelOffset]) {
    addMesh(
      `${name}-cells-${offset}`,
      new THREE.BoxGeometry(panelWidth, length, 0.09),
      materials.solar,
      [anchor[0] + offset, centerY, anchor[2]],
    )
    for (const cellOffset of [-0.25, 0.25]) {
      addMesh(
        `${name}-cell-column-${offset}-${cellOffset}`,
        new THREE.BoxGeometry(0.028, length, 0.105),
        materials.solarGrid,
        [
          anchor[0] + offset + panelWidth * cellOffset,
          centerY,
          anchor[2] + 0.01,
        ],
      )
    }
  }
  for (let index = 0; index <= 18; index += 1) {
    const y =
      anchor[1] +
      direction *
        (boomLength + (length * index) / 18)
    addMesh(
      `${name}-crossbar-${index}`,
      new THREE.BoxGeometry(width + 0.08, 0.035, 0.13),
      materials.solarGrid,
      [anchor[0], y, anchor[2]],
    )
  }
  for (const fraction of [0, 0.5, 1]) {
    const y =
      anchor[1] +
      direction * (boomLength + length * fraction)
    addMesh(
      `${name}-structural-crossbar-${fraction}`,
      new THREE.BoxGeometry(width + 0.2, 0.15, 0.17),
      materials.solarFrame,
      [anchor[0], y, anchor[2] + 0.02],
    )
  }
  for (const xOffset of [
    -width / 2,
    -centerGap / 2,
    centerGap / 2,
    width / 2,
  ]) {
    addMesh(
      `${name}-rail-${xOffset}`,
      new THREE.BoxGeometry(0.055, length, 0.14),
      materials.solarFrame,
      [anchor[0] + xOffset, centerY, anchor[2]],
    )
  }
  addCylinder(
    `${name}-boom`,
    boomLength,
    0.12,
    [anchor[0], anchor[1] + direction * (boomLength / 2), anchor[2]],
    materials.solarFrame,
    'y',
    12,
  )
  addMesh(
    `${name}-rotary-joint`,
    new THREE.SphereGeometry(0.38, 16, 10),
    materials.docking,
    anchor,
  )
}

function addHorizontalSolarWing(
  name,
  anchor,
  direction,
  length,
  width,
  material = materials.smallSolar,
) {
  const boomLength = 1.15
  const centerX = anchor[0] + direction * (length / 2 + boomLength)
  addMesh(
    `${name}-cells`,
    new THREE.BoxGeometry(length, width, 0.075),
    material,
    [centerX, anchor[1], anchor[2]],
  )
  for (let index = 0; index <= 8; index += 1) {
    const x =
      anchor[0] +
      direction *
        (boomLength + (length * index) / 8)
    addMesh(
      `${name}-divider-${index}`,
      new THREE.BoxGeometry(0.035, width + 0.05, 0.1),
      materials.solarFrame,
      [x, anchor[1], anchor[2]],
    )
  }
  for (const yOffset of [-width / 2, 0, width / 2]) {
    addMesh(
      `${name}-longitudinal-frame-${yOffset}`,
      new THREE.BoxGeometry(length, 0.035, 0.11),
      materials.solarFrame,
      [centerX, anchor[1] + yOffset, anchor[2]],
    )
  }
  addCylinder(
    `${name}-boom`,
    boomLength,
    0.075,
    [anchor[0] + direction * (boomLength / 2), anchor[1], anchor[2]],
    materials.docking,
    'x',
    10,
  )
}

function addArmSegment(name, start, end, radius = 0.09) {
  const startVector = new THREE.Vector3(...start)
  const endVector = new THREE.Vector3(...end)
  const direction = endVector.clone().sub(startVector)
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 12),
    materials.goldMli,
  )
  mesh.name = name
  mesh.position.copy(startVector).add(endVector).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  )
  root.add(mesh)
}

function addLabExteriorDetails(name, centerX, resourceX, direction) {
  const frontZ = 2.08
  for (const fraction of [-0.34, 0, 0.34]) {
    const x = centerX + fraction * 17.9
    addMesh(
      `${name}-front-MLI-panel-${fraction}`,
      new THREE.BoxGeometry(4.7, 1.05, 0.09),
      materials.hull,
      [x, 0.28, frontZ],
    )
    addMesh(
      `${name}-front-panel-seam-${fraction}`,
      new THREE.BoxGeometry(0.065, 2.7, 0.12),
      materials.docking,
      [x, 0, frontZ + 0.04],
    )
  }
  for (const offset of [-4.8, -1.6, 1.6, 4.8]) {
    addCylinder(
      `${name}-handrail-${offset}`,
      1.05,
      0.035,
      [centerX + direction * offset, 1.78, frontZ + 0.08],
      materials.solarFrame,
      'x',
      8,
    )
  }
  for (const y of [-1.84, 1.84]) {
    for (const z of [-1.84, 1.84]) {
      addCylinder(
        `${name}-service-truss-${y}-${z}`,
        3.7,
        0.065,
        [resourceX, y, z],
        materials.solarFrame,
        'x',
        8,
      )
    }
  }
  for (const xOffset of [-1.7, 1.7]) {
    addRing(
      `${name}-service-truss-ring-${xOffset}`,
      2.16,
      [resourceX + direction * xOffset, 0, 0],
      'x',
      0.065,
    )
  }
  addCylinder(
    `${name}-round-hatch`,
    0.12,
    0.42,
    [centerX - direction * 2.5, -0.72, frontZ + 0.04],
    materials.window,
    'z',
    24,
  )
  if (name === 'Mengtian') {
    addMesh(
      `${name}-flag-marking`,
      new THREE.BoxGeometry(0.72, 0.42, 0.055),
      materials.flag,
      [centerX + direction * 2.35, 0.72, frontZ + 0.06],
    )
  }
}

// The permanent modules occupy the XY plane so the canonical front view reads
// immediately as a T: Tianhe is the stem; Wentian and Mengtian are the bar.
addModule({
  name: 'Tianhe-core',
  length: 16.6,
  radius: 2.05,
  position: [0, 8.3, 0],
  axis: 'y',
})
addCylinder(
  'Tianhe-resource-section',
  4.4,
  1.68,
  [0, 14.3, 0],
  materials.darkMli,
  'y',
  36,
)
addMesh(
  'Tianhe-multi-docking-node',
  new THREE.SphereGeometry(2.25, 32, 20),
  materials.hull,
  [0, 0, 0],
)
addDockingPort('Tianhe-forward-port', [0, -2.25, 0], 'y')
addDockingPort('Tianhe-aft-port', [0, 16.65, 0], 'y')
addDockingPort('Tianhe-nadir-port', [0, 0, 2.25], 'z')
for (const y of [3.5, 7.1, 10.7]) {
  addMesh(
    `Tianhe-equipment-bay-${y}`,
    new THREE.BoxGeometry(1.1, 1.55, 0.28),
    y === 7.1 ? materials.goldMli : materials.hull,
    [0.82, y, 2.02],
  )
  addMesh(
    `Tianhe-cable-trunk-${y}`,
    new THREE.BoxGeometry(0.16, 2.4, 0.2),
    materials.docking,
    [-1.18, y, 2.04],
  )
}
for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
  addMesh(
    `Tianhe-node-camera-${angle}`,
    new THREE.BoxGeometry(0.36, 0.36, 0.48),
    materials.window,
    [Math.cos(angle) * 1.76, Math.sin(angle) * 1.76, 1.32],
    [0, 0, angle],
  )
}

for (const [name, direction] of [
  ['Wentian', -1],
  ['Mengtian', 1],
]) {
  const centerX = direction * 11.15
  const resourceX = direction * 18.05
  addModule({
    name: `${name}-laboratory`,
    length: 17.9,
    radius: 2.05,
    position: [centerX, 0, 0],
    axis: 'x',
  })
  addCylinder(
    `${name}-resource-section`,
    3.5,
    2.08,
    [resourceX, 0, 0],
    materials.darkMli,
    'x',
    32,
  )
  addDockingPort(
    `${name}-lateral-berthing-ring`,
    [direction * 2.3, 0, 0],
    'x',
  )
  addDockingPort(
    `${name}-outer-service-port`,
    [direction * 20.35, 0, 0],
    'x',
  )
  addSolarWing(`${name}-solar-upper`, [resourceX, 0, 0], 1)
  addSolarWing(`${name}-solar-lower`, [resourceX, 0, 0], -1)
  addMesh(
    `${name}-radiator`,
    new THREE.BoxGeometry(5.5, 1.35, 0.14),
    materials.radiator,
    [direction * 10.3, 2.0, 1.72],
    [0, direction * 0.12, 0],
  )
  for (const offset of [-3.2, 0, 3.2]) {
    addMesh(
      `${name}-external-payload-${offset}`,
      new THREE.BoxGeometry(1.35, 0.68, 0.78),
      offset === 0 ? materials.goldMli : materials.hull,
      [centerX + direction * offset, -1.83, 1.15],
    )
  }
  addLabExteriorDetails(name, centerX, resourceX, direction)
}

// Tianhe's smaller rigid wings sit near its resource section.
addHorizontalSolarWing(
  'Tianhe-solar-port',
  [0, 13.8, -0.28],
  -1,
  11.45,
  2.25,
)
addHorizontalSolarWing(
  'Tianhe-solar-starboard',
  [0, 13.8, -0.28],
  1,
  11.45,
  2.25,
)

// Tianzhou-10, docked at the aft port from 2026-05-11.
addCylinder(
  'Tianzhou-10-pressurized-cabin',
  5.2,
  1.62,
  [0, 19.35, 0],
  materials.whiteMli,
  'y',
  36,
)
addCylinder(
  'Tianzhou-10-service-module',
  3.5,
  1.38,
  [0, 23.65, 0],
  materials.darkMli,
  'y',
  32,
)
addRing('Tianzhou-10-docking-ring', 0.68, [0, 16.95, 0], 'y', 0.09)
addHorizontalSolarWing(
  'Tianzhou-10-solar-port',
  [0, 22.7, -0.22],
  -1,
  6.4,
  1.55,
)
addHorizontalSolarWing(
  'Tianzhou-10-solar-starboard',
  [0, 22.7, -0.22],
  1,
  6.4,
  1.55,
)
for (const x of [-0.78, -0.26, 0.26, 0.78]) {
  addMesh(
    `Tianzhou-10-engine-${x}`,
    new THREE.ConeGeometry(0.16, 0.4, 12),
    materials.docking,
    [x, 25.5, 0],
  )
}

// Shenzhou-23 is attached to Tianhe's nadir port. Keeping it on the radial
// axis (rather than faking another permanent module) makes an oblique view
// resemble the familiar cross-like full combination while preserving topology.
addCylinder(
  'Shenzhou-23-orbital-module',
  2.0,
  1.28,
  [0, 0, 3.25],
  materials.whiteMli,
  'z',
  32,
)
addMesh(
  'Shenzhou-23-descent-module',
  new THREE.ConeGeometry(1.35, 2.2, 32),
  materials.hull,
  [0, 0, 5.25],
  [Math.PI / 2, 0, 0],
)
addCylinder(
  'Shenzhou-23-service-module',
  2.8,
  1.32,
  [0, 0, 7.45],
  materials.darkMli,
  'z',
  32,
)
addRing('Shenzhou-23-docking-ring', 0.65, [0, 0, 2.35], 'z', 0.08)
addHorizontalSolarWing(
  'Shenzhou-23-solar-port',
  [0, 0, 7.5],
  -1,
  4.3,
  1.2,
)
addHorizontalSolarWing(
  'Shenzhou-23-solar-starboard',
  [0, 0, 7.5],
  1,
  4.3,
  1.2,
)

// External antennas, payload racks, and the two-section robotic arm provide
// close-up silhouette cues without pretending to reproduce flight CAD.
addMesh(
  'high-gain-dish',
  new THREE.ConeGeometry(1.05, 0.34, 32, 1, true),
  materials.hull,
  [1.2, 9.4, 2.05],
  [Math.PI / 2, 0, 0],
)
addCylinder(
  'high-gain-mast',
  1.8,
  0.075,
  [1.2, 9.4, 1.1],
  materials.docking,
  'z',
  10,
)
addArmSegment('robot-arm-shoulder', [-5.2, 1.8, 2.0], [-2.4, 3.0, 3.0])
addArmSegment('robot-arm-forearm', [-2.4, 3.0, 3.0], [0.7, 2.2, 3.8])
for (const [name, point] of [
  ['robot-arm-joint-a', [-5.2, 1.8, 2.0]],
  ['robot-arm-joint-b', [-2.4, 3.0, 3.0]],
  ['robot-arm-joint-c', [0.7, 2.2, 3.8]],
]) {
  addMesh(
    name,
    new THREE.SphereGeometry(0.24, 16, 10),
    materials.docking,
    point,
  )
}

root.updateMatrixWorld(true)
const dimensions = new THREE.Box3()
  .setFromObject(root)
  .getSize(new THREE.Vector3())
if (dimensions.x < 40 || dimensions.y < 53 || dimensions.z < 10) {
  throw new Error(
    `Tiangong configuration bounds are incomplete: ${dimensions
      .toArray()
      .map((value) => value.toFixed(2))
      .join(' × ')} m`,
  )
}

const currentRoot = root

// An undated planning variant: remove the 2026 visiting vehicles, then attach
// the announced 20-tonne-class multifunction module at Tianhe's forward port.
// Its detailed flight design is not public, so only the disclosed module,
// multi-port node, and cross topology are represented.
root = currentRoot.clone(true)
root.name = 'Tiangong-planned-cross'
root.userData.provenance =
  'Project-authored planning visualization of the announced Tiangong cross configuration. The expansion module has no official launch date or public engineering mesh.'
for (const child of [...root.children]) {
  if (
    child.name.startsWith('Shenzhou-23') ||
    child.name.startsWith('Tianzhou-10') ||
    child.name.startsWith('Tianhe-forward-port')
  ) {
    root.remove(child)
  }
}
addModule({
  name: 'Planned-multifunction-expansion-module',
  length: 15.2,
  radius: 2.05,
  position: [0, -9.85, 0],
  axis: 'y',
})
addCylinder(
  'Planned-expansion-resource-section',
  3.8,
  1.68,
  [0, -15.65, 0],
  materials.darkMli,
  'y',
  36,
)
addMesh(
  'Planned-expansion-multi-port-node',
  new THREE.SphereGeometry(2.25, 32, 20),
  materials.hull,
  [0, -18.3, 0],
)
addDockingPort('Planned-expansion-forward-port', [0, -20.55, 0], 'y')
addDockingPort('Planned-expansion-port-side', [-2.25, -18.3, 0], 'x')
addDockingPort('Planned-expansion-starboard-side', [2.25, -18.3, 0], 'x')
addDockingPort('Planned-expansion-nadir-port', [0, -18.3, 2.25], 'z')
addHorizontalSolarWing(
  'Planned-expansion-solar-port',
  [0, -14.5, -0.25],
  -1,
  6.8,
  1.45,
)
addHorizontalSolarWing(
  'Planned-expansion-solar-starboard',
  [0, -14.5, -0.25],
  1,
  6.8,
  1.45,
)
root.updateMatrixWorld(true)
const plannedRoot = root

async function exportModel(modelRoot, outputPath, fileStem) {
  const scene = new THREE.Scene()
  scene.name = `${modelRoot.name}-reconstruction`
  scene.add(modelRoot)
  scene.updateMatrixWorld(true)

  const exporter = new GLTFExporter()
  const output = await exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: true,
    trs: false,
  })
  const rawPath = join(workDir, `${fileStem}-raw.glb`)
  await writeFile(rawPath, Buffer.from(output))

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(
    npx,
    [
      '--yes',
      '@gltf-transform/cli@4.4.2',
      'optimize',
      rawPath,
      outputPath,
      '--instance',
      'false',
      '--compress',
      'meshopt',
      '--meshopt-level',
      'high',
      '--simplify',
      'false',
      '--texture-compress',
      'false',
      '--palette',
      'false',
    ],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) {
    throw new Error(
      `${fileStem} optimization failed with exit code ${result.status}`,
    )
  }
  return {
    rawBytes: output.byteLength,
    optimizedBytes: (await stat(outputPath)).size,
  }
}

try {
  const current = await exportModel(
    currentRoot,
    CURRENT_OUTPUT_PATH,
    'tiangong-current',
  )
  const planned = await exportModel(
    plannedRoot,
    PLANNED_OUTPUT_PATH,
    'tiangong-planned-cross',
  )
  console.log(
    `Generated Tiangong current/planned models: ` +
      `${(current.optimizedBytes / 1024).toFixed(1)} / ` +
      `${(planned.optimizedBytes / 1024).toFixed(1)} KiB ` +
      `(raw ${(current.rawBytes / 1024).toFixed(1)} / ` +
      `${(planned.rawBytes / 1024).toFixed(1)} KiB)`,
  )
} finally {
  await rm(workDir, { recursive: true, force: true })
}
