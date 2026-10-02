import { CATALOG_BY_ID, lookupFurniture } from '../furniture/catalog'
import { canPlace, pieceLimit, type Placement, type RoomSide, type Rotation } from './placement'
import { FLOORS, WALLS, type FloorId, type WallId } from './surfaces'

/**
 * Saved room layout. Same shape is meant for `PUT /api/rooms/me/layout` later.
 * Short keys keep a 30-piece room far under the 10 KB budget.
 *
 * { "v": 1, "floor": "wood", "wall": "ivory", "items": [{ "id": "bed", "x": 0, "y": 0, "r": 90 }] }
 *
 * x, y: anchor cell (top-left of the rotated footprint). r: clockwise rotation 0/90/180/270.
 */
export const LAYOUT_VERSION = 1

export type LayoutJson = {
  v: typeof LAYOUT_VERSION
  floor: FloorId
  wall: WallId
  items: { id: string; x: number; y: number; r: Rotation }[]
}

export type Layout = { floor: FloorId; wall: WallId; placements: Placement[] }

export function toLayoutJson({ floor, wall, placements }: Layout): LayoutJson {
  return {
    v: LAYOUT_VERSION,
    floor,
    wall,
    items: placements.map((p) => ({ id: p.furnitureId, x: p.x, y: p.y, r: p.rotation })),
  }
}

const ROTATIONS: readonly number[] = [0, 90, 180, 270]
const isCell = (n: unknown) => Number.isInteger(n)

/**
 * Parse untrusted layout JSON. Pieces that are malformed, unknown, overlapping, outside the room or
 * past the room's piece limit are dropped (counted in `dropped`) instead of failing the whole room.
 */
export function parseLayoutJson(
  text: string,
  fallback: Layout,
  side: RoomSide,
): { layout: Layout; dropped: number } | { error: 'invalid-json' | 'unsupported' } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { error: 'invalid-json' }
  }
  if (typeof data !== 'object' || data === null) return { error: 'unsupported' }
  const d = data as Record<string, unknown>
  if (d.v !== LAYOUT_VERSION || !Array.isArray(d.items)) return { error: 'unsupported' }

  const floor = FLOORS.some((f) => f.value === d.floor) ? (d.floor as FloorId) : fallback.floor
  const wall = WALLS.some((w) => w.value === d.wall) ? (d.wall as WallId) : fallback.wall

  const placements: Placement[] = []
  let dropped = 0
  for (const raw of d.items as unknown[]) {
    const it = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const ok =
      placements.length < pieceLimit(side) &&
      typeof it.id === 'string' &&
      CATALOG_BY_ID.has(it.id) &&
      isCell(it.x) &&
      isCell(it.y) &&
      ROTATIONS.includes(it.r as number)
    const p = ok ? { furnitureId: it.id as string, x: it.x as number, y: it.y as number, rotation: it.r as Rotation } : null
    if (p && canPlace(placements, p, lookupFurniture, side).ok) placements.push(p)
    else dropped++
  }
  return { layout: { floor, wall, placements }, dropped }
}

/** Browser storage for stage 1 (no backend yet). */
const STORAGE_KEY = 'miniroom.layout'

export function saveLayout(layout: Layout): number | null {
  const text = JSON.stringify(toLayoutJson(layout))
  try {
    localStorage.setItem(STORAGE_KEY, text)
  } catch {
    return null // storage full or blocked
  }
  return new Blob([text]).size
}

export function loadLayout(fallback: Layout, side: RoomSide): { layout: Layout; dropped: number } | null {
  let text: string | null = null
  try {
    text = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (text === null) return null
  const result = parseLayoutJson(text, fallback, side)
  return 'error' in result ? null : result
}
