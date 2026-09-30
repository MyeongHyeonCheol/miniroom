import { create } from 'zustand'
import { CATALOG } from '../furniture/catalog'

/** Numbers shown in the stats card and read by e2e tests via window.__miniroomStats. */
export type PerfStats = {
  fps: number
  frameMs: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  /** ms from navigation start to the first rendered frame (room outline) */
  firstFrameMs: number | null
  /** ms from navigation start until every furniture type in the room has loaded */
  furnitureReadyMs: number | null
  loadedTypes: string[]
}

export const usePerfStore = create<PerfStats>(() => ({
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  firstFrameMs: null,
  furnitureReadyMs: null,
  loadedTypes: [],
}))

declare global {
  interface Window {
    __miniroomStats?: PerfStats
  }
}

usePerfStore.subscribe((s) => {
  window.__miniroomStats = s
})

export function markFirstFrame() {
  if (usePerfStore.getState().firstFrameMs === null) usePerfStore.setState({ firstFrameMs: Math.round(performance.now()) })
}

/** Called once per furniture type when its glb has loaded and mounted. */
export function markFurnitureLoaded(id: string, expectedTypes?: number) {
  const s = usePerfStore.getState()
  if (s.loadedTypes.includes(id)) return
  const loadedTypes = [...s.loadedTypes, id]
  const expected = expectedTypes ?? CATALOG.length
  usePerfStore.setState({
    loadedTypes,
    furnitureReadyMs: loadedTypes.length >= expected ? Math.round(performance.now()) : s.furnitureReadyMs,
  })
}
