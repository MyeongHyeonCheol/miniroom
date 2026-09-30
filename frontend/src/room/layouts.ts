import { CATALOG_BY_ID } from '../furniture/catalog'
import { coveredCells, insideRoom, type Placement, type Rotation } from './placement'

/** Same layout as assets/blender/preview_room.py, headboard / desk back against the back wall. */
export const DEFAULT_LAYOUT: Placement[] = [
  { furnitureId: 'bed', x: 0, y: 0, rotation: 0 },
  { furnitureId: 'computer_desk', x: 3, y: 0, rotation: 0 },
  { furnitureId: 'plant_pot', x: 6, y: 0, rotation: 0 },
]

/** Deterministic PRNG so stress layouts are the same every run. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Stress layout: up to `count` non-overlapping pieces, big ones first, random rotations.
 * Mix is fixed (2 beds, 3 desks, rest plants) so 30 pieces fit into 64 cells.
 */
export function stressLayout(count: number, seed = 1): Placement[] {
  const rand = mulberry32(seed)
  const wanted = ['bed', 'bed', 'computer_desk', 'computer_desk', 'computer_desk']
  while (wanted.length < count) wanted.push('plant_pot')
  const used = new Set<string>()
  const out: Placement[] = []
  const rotations: Rotation[] = [0, 90, 180, 270]
  for (const id of wanted.slice(0, count)) {
    const size = CATALOG_BY_ID.get(id)!.size
    for (let attempt = 0; attempt < 400; attempt++) {
      const p: Placement = {
        furnitureId: id,
        x: Math.floor(rand() * 8),
        y: Math.floor(rand() * 8),
        rotation: rotations[Math.floor(rand() * 4)],
      }
      if (!insideRoom(p, size)) continue
      const cells = coveredCells(p, size)
      if (cells.some((c) => used.has(c))) continue
      cells.forEach((c) => used.add(c))
      out.push(p)
      break
    }
  }
  return out
}
