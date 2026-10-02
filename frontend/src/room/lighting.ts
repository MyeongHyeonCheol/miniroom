import * as THREE from 'three'

/**
 * Lighting drafts for the room, picked with `?light=` until one is chosen (docs/design.md, 2026-10-02 comparison).
 *
 * three.js divides light by pi for diffuse surfaces (physically based Lambert), so a light of intensity 1 straight
 * on a white face shows it at about 1/pi. The intensities here are chosen so lit faces come out near the palette
 * colors from assets/blender/common.py.
 */
export type Lighting = {
  label: string
  sky: string
  ground: string
  hemi: number
  sun: number
  toneMapping: THREE.ToneMapping
  exposure: number
}

export const LIGHTINGS = {
  // Current (stage 1): warm and contrasty; faces measured 83-89% of their palette brightness
  a: { label: '지금', sky: '#fff6e8', ground: '#c8a27a', hemi: 1.6, sun: 1.8, toneMapping: THREE.NoToneMapping, exposure: 1 },
  // Brighter, softer fill so side faces keep their color; still no tone mapping (palette colors exact on top faces)
  b: { label: '밝고 부드럽게', sky: '#ffffff', ground: '#f1e4d2', hemi: 2.6, sun: 1.35, toneMapping: THREE.NoToneMapping, exposure: 1 },
  // Like Blender's Material Preview: bright even light through AgX (Blender's default view transform)
  c: { label: '블렌더처럼', sky: '#ffffff', ground: '#ece2d6', hemi: 3.2, sun: 2.0, toneMapping: THREE.AgXToneMapping, exposure: 1.0 },
} satisfies Record<string, Lighting>

export type LightingId = keyof typeof LIGHTINGS

export function lightingFromUrl(): LightingId {
  const v = new URLSearchParams(window.location.search).get('light')
  return v && v in LIGHTINGS ? (v as LightingId) : 'a'
}
