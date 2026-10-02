// Shared with the backend's layout validation; the backend owns the file (docs/api.md PUT /api/rooms/me/layout)
import catalogJson from '../../../backend/src/main/resources/catalog/furniture.json' with { type: 'json' }

export type FurnitureDef = {
  id: string
  name: string
  category: string
  /** Footprint in cells [width (x), depth (y)] at rotation 0 */
  size: [number, number]
  glb: string
}

export const CATALOG = catalogJson as FurnitureDef[]
export const CATALOG_BY_ID = new Map(CATALOG.map((f) => [f.id, f]))
/** Wall decor hangs on wall slots (docs/api.md), not on floor cells; the editor shows slots in week 3. */
export const isWallDecor = (id: string) => CATALOG_BY_ID.get(id)?.category === 'wall'
/** What the floor furniture panel offers. */
export const FLOOR_CATALOG = CATALOG.filter((f) => !isWallDecor(f.id))

/** Size/category lookup for placement rules. */
export const lookupFurniture = (id: string) => {
  const def = CATALOG_BY_ID.get(id)
  if (!def) throw new Error(`Unknown furniture: ${id}`)
  return def
}
export const PALETTE_URL = '/models/palette.png'
