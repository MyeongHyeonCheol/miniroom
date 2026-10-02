import { create } from 'zustand'
import { lookupFurniture } from '../furniture/catalog'
import { loadLayout, parseLayoutJson, saveLayout, toLayoutJson, type Layout } from '../room/layoutJson'
import { DEFAULT_LAYOUT, stressLayout } from '../room/layouts'
import {
  canPlace,
  findFreeSpot,
  isRoomSide,
  pieceLimit,
  SIGNUP_SIDE,
  type Placement,
  type RoomSide,
  type Rotation,
} from '../room/placement'
import type { FloorId, WallId } from '../room/surfaces'

/** Piece being dragged: where it would land and whether that is allowed. */
export type DragState = {
  index: number
  /** grab point offset from the anchor cell, in cells */
  grabDx: number
  grabDy: number
  preview: Placement
  valid: boolean
}

export type Notice = { id: number; text: string; tone: 'info' | 'error' }

type RoomState = {
  /** Cells per room side. Every placement rule reads it from here. */
  size: RoomSide
  floor: FloorId
  wall: WallId
  shadows: boolean
  placements: Placement[]
  /** Furniture can be picked up and moved. Off when looking at a room; the editor (week 3) turns it on. */
  editable: boolean
  selected: number | null
  drag: DragState | null
  notice: Notice | null
  /** JSON of the last saved (or loaded) layout, to tell whether there are unsaved changes */
  savedJson: string | null
  /** The /dev/room playground: ?grid, ?stress, ?shadows and the browser-saved layout, editable. */
  loadPlayground: (search: URLSearchParams) => void
  /** A room from GET /api/rooms/{slug}, to look at. */
  showRoom: (size: number, layout: unknown) => void
  /** The default first room, behind the logged-out home screen. */
  showSample: () => void
  setFloor: (floor: FloorId) => void
  setWall: (wall: WallId) => void
  setShadows: (on: boolean) => void
  setPlacements: (placements: Placement[]) => void
  select: (index: number | null) => void
  startDrag: (index: number, cellX: number, cellY: number) => void
  moveDrag: (cellX: number, cellY: number) => void
  endDrag: () => void
  rotateSelected: () => void
  removeSelected: () => void
  addFurniture: (furnitureId: string) => void
  notify: (text: string, tone?: Notice['tone']) => void
  save: () => void
}

const DEFAULT: Layout = { floor: 'wood', wall: 'ivory', placements: DEFAULT_LAYOUT }

/** Canonical JSON of the current layout (used for saving and for the unsaved-changes check). */
export const layoutJsonOf = (s: Pick<RoomState, 'floor' | 'wall' | 'placements'>) =>
  JSON.stringify(toLayoutJson(s))

const MESSAGES = {
  overlap: '다른 가구와 겹쳐서 놓을 수 없어요',
  outside: '방 밖으로 나가서 놓을 수 없어요',
  full: (limit: number) => `가구는 방에 ${limit}개까지 놓을 수 있어요`,
  noSpace: '빈 자리가 없어요',
  saveFailed: '저장하지 못했어요. 브라우저 저장소를 확인해 주세요',
  dropped: (n: number) => `저장된 가구 중 ${n}개를 놓을 수 없어서 뺐어요`,
}

let noticeId = 0
const notice = (text: string, tone: Notice['tone'] = 'info'): Notice => ({ id: ++noticeId, text, tone })

/** Fresh view of a layout: nothing selected or held. */
const view = (size: RoomSide, layout: Layout) => ({
  size,
  floor: layout.floor,
  wall: layout.wall,
  placements: layout.placements,
  selected: null,
  drag: null,
})

export const useRoomStore = create<RoomState>((set, get) => ({
  ...view(SIGNUP_SIDE, { ...DEFAULT, placements: [] }),
  shadows: false,
  editable: false,
  notice: null,
  savedJson: null,

  loadPlayground: (search) => {
    const grid = Number(search.get('grid'))
    const size: RoomSide = isRoomSide(grid) ? grid : SIGNUP_SIDE
    const shadows = search.get('shadows') === '1'
    const stress = Number(search.get('stress'))
    if (stress > 0) {
      const placements = stressLayout(Math.min(stress, pieceLimit(size)), size)
      return set({ ...view(size, { ...DEFAULT, placements }), shadows, editable: true, savedJson: null })
    }
    const loaded = loadLayout(DEFAULT, size)
    const layout = loaded?.layout ?? DEFAULT
    set({ ...view(size, layout), shadows, editable: true, savedJson: loaded ? layoutJsonOf(layout) : null })
    if (loaded && loaded.dropped > 0) set({ notice: notice(MESSAGES.dropped(loaded.dropped), 'error') })
  },

  showRoom: (rawSize, layout) => {
    const size: RoomSide = isRoomSide(rawSize) ? rawSize : SIGNUP_SIDE
    // The server checked this layout when it was saved; parsing again only guards the renderer
    const parsed = parseLayoutJson(JSON.stringify(layout), { ...DEFAULT, placements: [] }, size)
    const shown = 'error' in parsed ? { ...DEFAULT, placements: [] } : parsed.layout
    set({ ...view(size, shown), editable: false, savedJson: layoutJsonOf(shown) })
  },

  showSample: () => set({ ...view(SIGNUP_SIDE, DEFAULT), editable: false, savedJson: null }),

  setFloor: (floor) => set({ floor }),
  setWall: (wall) => set({ wall }),
  setShadows: (shadows) => set({ shadows }),
  setPlacements: (placements) => set({ placements, selected: null, drag: null }),

  select: (selected) => set({ selected }),

  startDrag: (index, cellX, cellY) => {
    const p = get().placements[index]
    set({
      selected: index,
      drag: { index, grabDx: cellX - p.x, grabDy: cellY - p.y, preview: p, valid: true },
    })
  },

  moveDrag: (cellX, cellY) => {
    const { drag, placements, size } = get()
    if (!drag) return
    const preview = { ...drag.preview, x: cellX - drag.grabDx, y: cellY - drag.grabDy }
    if (preview.x === drag.preview.x && preview.y === drag.preview.y) return
    const valid = canPlace(placements, preview, lookupFurniture, size, drag.index).ok
    set({ drag: { ...drag, preview, valid } })
  },

  endDrag: () => {
    const { drag, placements, size, notify } = get()
    if (!drag) return
    const from = placements[drag.index]
    if (from.x === drag.preview.x && from.y === drag.preview.y) return set({ drag: null }) // a click, not a move
    const check = canPlace(placements, drag.preview, lookupFurniture, size, drag.index)
    if (check.ok) {
      const next = placements.slice()
      next[drag.index] = drag.preview
      set({ placements: next, drag: null })
    } else {
      set({ drag: null }) // snap back to the original cell
      notify(MESSAGES[check.reason], 'error')
    }
  },

  rotateSelected: () => {
    const { selected, placements, drag, size, notify } = get()
    if (selected === null || drag) return
    const p = placements[selected]
    const rotated = { ...p, rotation: ((p.rotation + 90) % 360) as Rotation }
    const check = canPlace(placements, rotated, lookupFurniture, size, selected)
    if (!check.ok) return notify(MESSAGES[check.reason], 'error')
    const next = placements.slice()
    next[selected] = rotated
    set({ placements: next })
  },

  removeSelected: () => {
    const { selected, placements, drag } = get()
    if (selected === null || drag) return
    set({ placements: placements.filter((_, i) => i !== selected), selected: null, drag: null })
  },

  addFurniture: (furnitureId) => {
    const { placements, size, notify } = get()
    const limit = pieceLimit(size)
    if (placements.length >= limit) return notify(MESSAGES.full(limit), 'error')
    const spot = findFreeSpot(placements, furnitureId, lookupFurniture, size)
    if (!spot) return notify(MESSAGES.noSpace, 'error')
    set({ placements: [...placements, spot], selected: placements.length })
  },

  notify: (text, tone = 'info') => set({ notice: { id: ++noticeId, text, tone } }),

  save: () => {
    const { floor, wall, placements, notify } = get()
    const bytes = saveLayout({ floor, wall, placements })
    if (bytes === null) return notify(MESSAGES.saveFailed, 'error')
    set({ savedJson: layoutJsonOf({ floor, wall, placements }) })
    notify(`저장했어요 (${(bytes / 1024).toFixed(1)}KB)`)
  },
}))

declare global {
  interface Window {
    __miniroomRoom?: () => RoomState
  }
}
// Read-only handle for e2e tests
window.__miniroomRoom = () => useRoomStore.getState()
