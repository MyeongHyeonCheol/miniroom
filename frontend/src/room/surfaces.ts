import * as THREE from 'three'
// Shared with the backend's layout validation; the backend owns the file (docs/api.md PUT /api/rooms/me/layout)
import surfacesJson from '../../../backend/src/main/resources/catalog/surfaces.json' with { type: 'json' }

/**
 * Floor and wallpaper textures drawn on a canvas (no image files for the prototype).
 * Colors follow the furniture palette in assets/blender/common.py.
 * The ids and names come from the shared surfaces.json; a new id there also needs a drawer below.
 */
export type FloorId = 'wood' | 'check' | 'carpet'
export type WallId = 'ivory' | 'skycheck' | 'strawberry'

export const FLOORS = surfacesJson.floors.map((f) => ({ value: f.id as FloorId, label: f.name }))
export const WALLS = surfacesJson.walls.map((w) => ({ value: w.id as WallId, label: w.name }))

const SIZE = 256

function canvas(draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  const g = c.getContext('2d')!
  draw(g)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

/** Small deterministic noise so surfaces don't look flat. */
function speckle(g: CanvasRenderingContext2D, color: string, count: number, maxR: number, seed = 7) {
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  g.fillStyle = color
  for (let i = 0; i < count; i++) {
    g.beginPath()
    g.arc(rand() * SIZE, rand() * SIZE, rand() * maxR + 0.5, 0, Math.PI * 2)
    g.fill()
  }
}

const floorDrawers: Record<FloorId, (g: CanvasRenderingContext2D) => void> = {
  // 4 planks per tile, staggered joints
  wood: (g) => {
    const colors = ['#c89b6d', '#bf915f', '#cfa576', '#c49566']
    const h = SIZE / 4
    for (let i = 0; i < 4; i++) {
      g.fillStyle = colors[i]
      g.fillRect(0, i * h, SIZE, h)
      g.fillStyle = 'rgb(107 68 40 / 0.35)'
      g.fillRect(0, i * h, SIZE, 2)
      const joint = (i % 2 === 0 ? 0.3 : 0.75) * SIZE
      g.fillRect(joint, i * h, 2, h)
    }
    speckle(g, 'rgb(107 68 40 / 0.12)', 120, 1.5)
  },
  // cream / beige checker linoleum
  check: (g) => {
    const n = 4
    const s = SIZE / n
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        g.fillStyle = (i + j) % 2 === 0 ? '#e8dcc0' : '#f4efe6'
        g.fillRect(i * s, j * s, s, s)
      }
    speckle(g, 'rgb(156 107 67 / 0.08)', 80, 1)
  },
  // soft dusty-blue carpet with fibers
  carpet: (g) => {
    g.fillStyle = '#9fb8d0'
    g.fillRect(0, 0, SIZE, SIZE)
    speckle(g, 'rgb(255 255 255 / 0.18)', 900, 1.2, 3)
    speckle(g, 'rgb(61 83 110 / 0.12)', 700, 1.2, 11)
  },
}

const wallDrawers: Record<WallId, (g: CanvasRenderingContext2D) => void> = {
  ivory: (g) => {
    g.fillStyle = '#f7f0e1'
    g.fillRect(0, 0, SIZE, SIZE)
    speckle(g, 'rgb(156 107 67 / 0.05)', 200, 1.2)
  },
  skycheck: (g) => {
    g.fillStyle = '#f4f9fb'
    g.fillRect(0, 0, SIZE, SIZE)
    g.fillStyle = 'rgb(102 189 230 / 0.28)'
    const s = SIZE / 4
    for (let i = 0; i < 4; i++) {
      g.fillRect(i * s + s * 0.4, 0, s * 0.2, SIZE)
      g.fillRect(0, i * s + s * 0.4, SIZE, s * 0.2)
    }
  },
  strawberry: (g) => {
    g.fillStyle = '#fbe9ec'
    g.fillRect(0, 0, SIZE, SIZE)
    const s = SIZE / 4
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const x = i * s + s / 2 + (j % 2) * (s / 2) - s / 4
        const y = j * s + s / 2
        // berry
        g.fillStyle = '#d9504a'
        g.beginPath()
        g.moveTo(x - 9, y - 4)
        g.quadraticCurveTo(x, y - 9, x + 9, y - 4)
        g.quadraticCurveTo(x + 7, y + 8, x, y + 12)
        g.quadraticCurveTo(x - 7, y + 8, x - 9, y - 4)
        g.fill()
        // leaves
        g.fillStyle = '#5a9a45'
        g.beginPath()
        g.ellipse(x - 4, y - 7, 5, 2.5, -0.4, 0, Math.PI * 2)
        g.ellipse(x + 4, y - 7, 5, 2.5, 0.4, 0, Math.PI * 2)
        g.fill()
        // seeds
        g.fillStyle = '#f2cf5b'
        for (const [dx, dy] of [[-3, 0], [3, 1], [0, 5], [-2, 7], [3, -3]]) g.fillRect(x + dx, y + dy, 1.6, 1.6)
      }
  },
}

const cache = new Map<string, THREE.CanvasTexture>()

/** Cached texture. `repeat` = tiles across the surface. */
export function surfaceTexture(kind: 'floor' | 'wall', id: FloorId | WallId, repeat: [number, number]) {
  const key = `${kind}:${id}:${repeat.join('x')}`
  let tex = cache.get(key)
  if (!tex) {
    const draw = kind === 'floor' ? floorDrawers[id as FloorId] : wallDrawers[id as WallId]
    tex = canvas(draw)
    tex.repeat.set(...repeat)
    cache.set(key, tex)
  }
  return tex
}
