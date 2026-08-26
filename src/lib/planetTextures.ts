import type { TextureKind } from '@/data/planets'
import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function noise2(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const n00 = hash(xi * 13.1 + yi * 47.3)
  const n10 = hash((xi + 1) * 13.1 + yi * 47.3)
  const n01 = hash(xi * 13.1 + (yi + 1) * 47.3)
  const n11 = hash((xi + 1) * 13.1 + (yi + 1) * 47.3)
  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v
}

function fbm(x: number, y: number, octaves = 5): number {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    value += noise2(x * freq, y * freq) * amp
    amp *= 0.5
    freq *= 2
  }
  return value
}

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '')
  const v = Number.parseInt(n, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function getPlanetTexture(id: string, kind: TextureKind, color: string): THREE.CanvasTexture {
  const key = `${id}-${kind}-${color}`
  const hit = cache.get(key)
  if (hit) return hit

  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D unavailable')
  }

  const image = ctx.createImageData(width, height)
  const data = image.data
  const [br, bg, bb] = hexToRgb(color)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width
      const v = y / height
      let r = br
      let g = bg
      let b = bb

      if (kind === 'gas') {
        const bands = Math.sin(v * Math.PI * 14 + fbm(u * 3, v * 8) * 2.4)
        const storm = fbm(u * 6 + 8, v * 4 + 2)
        const t = (bands * 0.5 + 0.5) * 0.7 + storm * 0.3
        r = mix(br * 0.55, Math.min(255, br * 1.25), t)
        g = mix(bg * 0.5, Math.min(255, bg * 1.15), t)
        b = mix(bb * 0.45, Math.min(255, bb * 1.1), t)
        if (id === 'jupiter' && Math.hypot(u - 0.72, (v - 0.58) * 1.6) < 0.07) {
          r = mix(r, 196, 0.7)
          g = mix(g, 86, 0.7)
          b = mix(b, 54, 0.7)
        }
      } else if (kind === 'ice') {
        const n = fbm(u * 5, v * 8)
        const band = Math.sin(v * Math.PI * 8 + n * 1.8)
        const t = n * 0.65 + (band * 0.5 + 0.5) * 0.35
        r = mix(br * 0.45, Math.min(255, br + 70), t)
        g = mix(bg * 0.5, Math.min(255, bg + 50), t)
        b = mix(bb * 0.55, Math.min(255, bb + 40), t)
      } else if (kind === 'star') {
        const n = fbm(u * 8, v * 8, 4)
        r = mix(255, br, 0.35 + n * 0.4)
        g = mix(230, bg, 0.4 + n * 0.3)
        b = mix(160, bb, 0.5)
      } else {
        const n = fbm(u * 7, v * 6)
        const crater = fbm(u * 18, v * 16, 3)
        const t = n * 0.75 + crater * 0.25
        r = mix(br * 0.45, Math.min(255, br * 1.2), t)
        g = mix(bg * 0.45, Math.min(255, bg * 1.15), t)
        b = mix(bb * 0.45, Math.min(255, bb * 1.1), t)
        if (id === 'earth') {
          const land = fbm(u * 6 + 2, v * 5 + 1)
          const cloud = fbm(u * 10 + 4, v * 7, 3)
          if (land > 0.52) {
            r = mix(46, 210, (land - 0.52) * 2)
            g = mix(110, 190, (land - 0.52) * 2)
            b = mix(52, 90, 0.3)
          } else {
            r = mix(18, 70, land)
            g = mix(70, 150, land)
            b = mix(140, 220, land)
          }
          if (v < 0.12 || v > 0.88) {
            r = mix(r, 240, 0.75)
            g = mix(g, 245, 0.75)
            b = mix(b, 250, 0.75)
          }
          if (cloud > 0.62) {
            const c = (cloud - 0.62) * 2.2
            r = mix(r, 245, c)
            g = mix(g, 248, c)
            b = mix(b, 255, c)
          }
        }
      }

      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  cache.set(key, texture)
  return texture
}

export function getRingTexture(): THREE.CanvasTexture {
  const key = 'saturn-rings'
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')

  const image = ctx.createImageData(canvas.width, canvas.height)
  for (let x = 0; x < canvas.width; x++) {
    const u = x / canvas.width
    const cassini = u > 0.62 && u < 0.68
    const gap = u > 0.28 && u < 0.3
    const n = hash(u * 240)
    const alpha = cassini || gap ? 0 : 90 + n * 120
    const shade = 170 + n * 70
    for (let y = 0; y < canvas.height; y++) {
      const i = (y * canvas.width + x) * 4
      image.data[i] = shade
      image.data[i + 1] = shade * 0.92
      image.data[i + 2] = shade * 0.75
      image.data[i + 3] = alpha
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

export function getGlowTexture(): THREE.CanvasTexture {
  const key = 'sun-glow'
  const hit = cache.get(key)
  if (hit) return hit

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')

  // Fast falloff: a slow-decaying veil tints background stars orange and its
  // edge reads as a faint circular "mask" at some zoom levels.
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255, 244, 200, 1)')
  gradient.addColorStop(0.16, 'rgba(255, 196, 80, 0.82)')
  gradient.addColorStop(0.36, 'rgba(255, 130, 36, 0.22)')
  gradient.addColorStop(0.62, 'rgba(255, 96, 12, 0.05)')
  gradient.addColorStop(1, 'rgba(255, 80, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  cache.set(key, texture)
  return texture
}
