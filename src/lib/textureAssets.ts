import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

import type { TextureKind } from '@/data/planets'
import { getPlanetTexture } from './planetTextures'

/** Equirectangular surface maps served from public/textures. */
const BODY_TEXTURE_FILES: Record<string, string> = {
  sun: '/textures/sun.jpg',
  mercury: '/textures/mercury.jpg',
  venus: '/textures/venus.jpg',
  earth: '/textures/earth.jpg',
  mars: '/textures/mars.jpg',
  jupiter: '/textures/jupiter.jpg',
  saturn: '/textures/saturn.jpg',
  uranus: '/textures/uranus.jpg',
  neptune: '/textures/neptune.jpg',
  pluto: '/textures/pluto.jpg',
  moon: '/textures/moon.jpg',
}

export const EARTH_CLOUDS_URL = '/textures/earth_clouds.jpg'
export const SATURN_RING_COLOR_URL = '/textures/saturn_ring_color.jpg'
export const SATURN_RING_ALPHA_URL = '/textures/saturn_ring_pattern.gif'
export const MILKY_WAY_URL = '/textures/milky_way.jpg'

type WrapMode = 'repeat' | 'clamp'

const fileCache = new Map<string, Promise<THREE.Texture | null>>()
const loader = new THREE.TextureLoader()

export function loadFileTexture(
  path: string,
  srgb = true,
  wrapU: WrapMode = 'repeat',
): Promise<THREE.Texture | null> {
  let pending = fileCache.get(path)
  if (!pending) {
    pending = loader
      .loadAsync(path)
      .then((texture) => {
        texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
        texture.anisotropy = 8
        texture.wrapS = wrapU === 'repeat' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        return texture
      })
      .catch(() => null)
    fileCache.set(path, pending)
  }
  return pending
}

export function useFileTexture(
  path: string | null,
  srgb = true,
  wrapU: WrapMode = 'repeat',
): THREE.Texture | null {
  const [entry, setEntry] = useState<{ path: string; texture: THREE.Texture } | null>(null)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    loadFileTexture(path, srgb, wrapU).then((loaded) => {
      if (!cancelled && loaded) setEntry({ path, texture: loaded })
    })
    return () => {
      cancelled = true
    }
  }, [path, srgb, wrapU])

  return path && entry?.path === path ? entry.texture : null
}

export type BodySurface = {
  texture: THREE.Texture
  /** True when the photographic file texture is active (vs procedural fallback). */
  isPhoto: boolean
}

/**
 * Returns the best available surface texture for a body: the procedural canvas
 * texture renders immediately, then the photographic map swaps in once loaded.
 * Pass `enabled = false` to force the lightweight procedural texture.
 */
export function useBodySurface(
  id: string,
  kind: TextureKind,
  fallbackColor: string,
  enabled = true,
): BodySurface {
  const procedural = useMemo(
    () => getPlanetTexture(id, kind, fallbackColor),
    [id, kind, fallbackColor],
  )
  const photo = useFileTexture(enabled ? (BODY_TEXTURE_FILES[id] ?? null) : null)

  return photo ? { texture: photo, isPhoto: true } : { texture: procedural, isPhoto: false }
}
