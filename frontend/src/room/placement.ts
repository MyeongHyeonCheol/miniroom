/**
 * Room coordinates.
 *
 * - 1 cell = 0.5 m. A room is side x side cells (AGENTS.md: 12 on signup, widened to 16/20/24). The side comes
 *   with the room (GET /api/rooms/{slug} `size`), so every rule here takes it as an argument.
 *   Cell (x, y): x grows along world +X, y along world +Z. Widening adds cells on the +X/+Z side only,
 *   so saved anchors stay valid.
 * - Walls stand on the x = 0 side (left) and the y = 0 side (back). The camera looks from +X/+Z.
 * - A placement is stored as the anchor cell (top-left = min x, min y of the footprint) + rotation.
 * - Models have their origin at the footprint center on the floor and face +Z at rotation 0.
 *   Rotation is clockwise seen from above, in 90-degree steps.
 * Same rules as the backend's LayoutValidator, which checks every save.
 */
export const CELL = 0.5
/** Room sides a room can have, and the piece limit (wall decor included) for each. AGENTS.md "3D 방과 가구 규칙". */
export const PIECE_LIMITS = { 12: 45, 16: 60, 20: 90, 24: 120 } as const
export type RoomSide = keyof typeof PIECE_LIMITS
export const SIGNUP_SIDE: RoomSide = 12

export const isRoomSide = (n: unknown): n is RoomSide => typeof n === 'number' && n in PIECE_LIMITS
export const pieceLimit = (side: RoomSide): number => PIECE_LIMITS[side]
/** Length of one room side in meters. */
export const roomMeters = (side: RoomSide) => CELL * side

/** Room shell, in meters. Walls stand outside the grid (x < 0, z < 0). */
export const WALL_H = 2.4
export const WALL_T = 0.12
export const FLOOR_T = 0.12
/** World-space box of the room (floor slab bottom to wall top, walls included), for camera fitting. */
export function roomBounds(side: RoomSide): [[number, number, number], [number, number, number]] {
  const m = roomMeters(side)
  return [
    [-WALL_T, -FLOOR_T, -WALL_T],
    [m, WALL_H - FLOOR_T, m],
  ]
}

export type Rotation = 0 | 90 | 180 | 270

export type Placement = {
  furnitureId: string
  x: number
  y: number
  rotation: Rotation
}

/** Footprint in cells after rotation: 90/270 swap width and depth. */
export function rotatedSize([w, d]: readonly [number, number], rotation: Rotation): [number, number] {
  return rotation === 90 || rotation === 270 ? [d, w] : [w, d]
}

/** World position (footprint center on the floor) and Y rotation in radians. */
export function toWorld(
  p: Pick<Placement, 'x' | 'y' | 'rotation'>,
  size: readonly [number, number],
): { position: [number, number, number]; rotationY: number } {
  const [w, d] = rotatedSize(size, p.rotation)
  return {
    position: [(p.x + w / 2) * CELL, 0, (p.y + d / 2) * CELL],
    // three.js +Y rotation is counter-clockwise seen from above
    rotationY: (-p.rotation * Math.PI) / 180,
  }
}

/** Cells covered by a placement, as "x,y" keys. */
export function coveredCells(p: Pick<Placement, 'x' | 'y' | 'rotation'>, size: readonly [number, number]): string[] {
  const [w, d] = rotatedSize(size, p.rotation)
  const cells: string[] = []
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) cells.push(`${p.x + i},${p.y + j}`)
  return cells
}

export function insideRoom(
  p: Pick<Placement, 'x' | 'y' | 'rotation'>,
  size: readonly [number, number],
  side: RoomSide,
): boolean {
  const [w, d] = rotatedSize(size, p.rotation)
  return p.x >= 0 && p.y >= 0 && p.x + w <= side && p.y + d <= side
}

export type FurnitureInfo = { size: readonly [number, number]; category: string }
export type Lookup = (furnitureId: string) => FurnitureInfo

export type PlaceCheck = { ok: true } | { ok: false; reason: 'outside' | 'overlap' }

/**
 * Can `candidate` go where it is, given the other placements?
 * Cell-based. A rug may overlap other furniture, but never another rug. `ignoreIndex` skips the
 * piece being moved.
 */
export function canPlace(
  placements: readonly Placement[],
  candidate: Placement,
  lookup: Lookup,
  side: RoomSide,
  ignoreIndex = -1,
): PlaceCheck {
  const info = lookup(candidate.furnitureId)
  if (!insideRoom(candidate, info.size, side)) return { ok: false, reason: 'outside' }
  const mine = new Set(coveredCells(candidate, info.size))
  const isRug = info.category === 'rug'
  for (let i = 0; i < placements.length; i++) {
    if (i === ignoreIndex) continue
    const other = placements[i]
    const otherInfo = lookup(other.furnitureId)
    if (isRug !== (otherInfo.category === 'rug')) continue // rug over furniture is fine
    if (coveredCells(other, otherInfo.size).some((c) => mine.has(c))) return { ok: false, reason: 'overlap' }
  }
  return { ok: true }
}

/** First free spot scanning row by row, trying all rotations. */
export function findFreeSpot(
  placements: readonly Placement[],
  furnitureId: string,
  lookup: Lookup,
  side: RoomSide,
): Placement | null {
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++)
      for (const rotation of [0, 90, 180, 270] as const) {
        const p: Placement = { furnitureId, x, y, rotation }
        if (canPlace(placements, p, lookup, side).ok) return p
      }
  return null
}

/** Cell under a floor point (world x/z), clamped to the room. */
export function cellAt(worldX: number, worldZ: number, side: RoomSide): [number, number] {
  const clamp = (v: number) => Math.min(side - 1, Math.max(0, Math.floor(v / CELL)))
  return [clamp(worldX), clamp(worldZ)]
}
