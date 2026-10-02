import { Html, Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { lookupFurniture } from '../furniture/catalog'
import { useFurnitureMesh } from '../furniture/useFurnitureMesh'
import { useRoomStore } from '../store/roomStore'
import { IconButton, RotateIcon, TrashIcon } from '../ui/IconButton'
import { CELL, rotatedSize, type Placement, type RoomSide } from './placement'
import { cellFromClient } from './pointer'

// docs/design.md "3D 위 표시 색"
const CELL_OK = { color: '#8CC48C', opacity: 0.45 }
const CELL_BLOCKED = { color: '#E07A6B', opacity: 0.5 }
const SELECTED = '#66BDE6'

/** Footprint rectangle in cells, clipped to the room: [x0, y0, x1, y1]. */
function footprint(p: Placement, side: RoomSide): [number, number, number, number] {
  const [w, d] = rotatedSize(lookupFurniture(p.furnitureId).size, p.rotation)
  const clip = (v: number) => Math.min(side, Math.max(0, v))
  return [clip(p.x), clip(p.y), clip(p.x + w), clip(p.y + d)]
}

/** Cells the dragged piece would cover: green if it can land, red if not. */
function DropCells({ preview, valid }: { preview: Placement; valid: boolean }) {
  const side = useRoomStore((s) => s.size)
  const [x0, y0, x1, y1] = footprint(preview, side)
  if (x1 <= x0 || y1 <= y0) return null
  const { color, opacity } = valid ? CELL_OK : CELL_BLOCKED
  return (
    <mesh position={[((x0 + x1) / 2) * CELL, 0.004, ((y0 + y1) / 2) * CELL]} rotation-x={-Math.PI / 2} raycast={() => null}>
      <planeGeometry args={[(x1 - x0) * CELL, (y1 - y0) * CELL]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

/** Outline of the selected piece's cells, and rotate / delete buttons above the model. */
function Selection({ placement }: { placement: Placement }) {
  const { height } = useFurnitureMesh(placement.furnitureId)
  const rotateSelected = useRoomStore((s) => s.rotateSelected)
  const removeSelected = useRoomStore((s) => s.removeSelected)
  const side = useRoomStore((s) => s.size)
  const [x0, y0, x1, y1] = footprint(placement, side).map((v) => v * CELL)
  const y = 0.006
  return (
    <>
      <Line
        points={[[x0, y, y0], [x1, y, y0], [x1, y, y1], [x0, y, y1], [x0, y, y0]]}
        color={SELECTED}
        lineWidth={3}
        raycast={() => null}
      />
      <Html position={[(x0 + x1) / 2, height + 0.2, (y0 + y1) / 2]} center zIndexRange={[20, 0]}>
        <div className="flex gap-2" data-testid="selection-actions">
          <IconButton label="회전 (R)" onClick={rotateSelected}><RotateIcon /></IconButton>
          <IconButton label="삭제 (Delete)" onClick={removeSelected}><TrashIcon /></IconButton>
        </div>
      </Html>
    </>
  )
}

/**
 * While dragging, pointer moves are read from the whole window (the pointer may pass over other
 * furniture, UI, or leave the canvas) and turned into a floor cell.
 */
function DragController() {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  const dragging = useRoomStore((s) => s.drag !== null)
  const valid = useRoomStore((s) => s.drag?.valid ?? true)

  useEffect(() => {
    if (!dragging) return
    const { moveDrag, endDrag } = useRoomStore.getState()
    const move = (e: PointerEvent) => {
      const cell = cellFromClient(e.clientX, e.clientY, canvas, camera, useRoomStore.getState().size)
      if (cell) moveDrag(cell[0], cell[1])
    }
    const up = () => endDrag()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      document.body.style.cursor = ''
    }
  }, [dragging, canvas, camera])

  useEffect(() => {
    if (dragging) document.body.style.cursor = valid ? 'grabbing' : 'not-allowed'
  }, [dragging, valid])

  // For e2e tests: screen position of a point given in cells (x, y) and meters above the floor
  useEffect(() => {
    window.__miniroomCellToScreen = (x, y, height = 0) => {
      const r = canvas.getBoundingClientRect()
      const v = new THREE.Vector3(x * CELL, height, y * CELL).project(camera)
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
    }
  }, [canvas, camera])

  return null
}

export function PlacementOverlay() {
  const editable = useRoomStore((s) => s.editable)
  const drag = useRoomStore((s) => s.drag)
  const selected = useRoomStore((s) => (s.selected === null ? null : s.placements[s.selected] ?? null))
  if (!editable) return null
  return (
    <>
      <DragController />
      {drag && <DropCells preview={drag.preview} valid={drag.valid} />}
      {!drag && selected && (
        <Suspense fallback={null}>
          <Selection placement={selected} />
        </Suspense>
      )}
    </>
  )
}

declare global {
  interface Window {
    __miniroomCellToScreen?: (x: number, y: number, height?: number) => { x: number; y: number }
  }
}
