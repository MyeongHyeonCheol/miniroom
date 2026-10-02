/**
 * Room lighting (docs/design.md "방 조명", chosen 2026-10-02 from three drafts compared in the app).
 *
 * three.js divides light by pi for diffuse surfaces (physically based Lambert), so a light of intensity 1 straight
 * on a white face shows it at about 1/pi. A bright, soft sky fill plus a moderate sun brings lit faces to their
 * palette colors from assets/blender/common.py (measured 99-109% on top, front and side faces), without tone
 * mapping, so the palette stays exact.
 */
export const LIGHT = {
  sky: '#ffffff',
  ground: '#f1e4d2',
  hemi: 2.6,
  sun: 1.35,
  sunColor: '#fff1dc',
} as const
