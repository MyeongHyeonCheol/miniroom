import { useTexture } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { markFurnitureLoaded } from '../debug/perf'
import { toWorld, type Placement } from '../room/placement'
import { cellAtPoint, setDragPlaneHeight } from '../room/pointer'
import { useRoomStore } from '../store/roomStore'
import { PALETTE_URL } from './catalog'
import { placementMatrix, useFurnitureMesh } from './useFurnitureMesh'

/** Lift of the piece being dragged, so it reads as "picked up". */
const DRAG_LIFT = 0.06
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0)

/** One material for every piece of furniture, using the shared palette texture. */
function configurePalette(tex: THREE.Texture) {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = false // glTF UV convention
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
}

function usePaletteMaterial() {
  const tex = useTexture(PALETTE_URL, configurePalette)
  return useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }), [tex])
}

type Item = { placement: Placement; index: number }

/**
 * All placements of one furniture type drawn as a single InstancedMesh (1 draw call).
 * The piece being dragged is hidden here and drawn as one extra mesh at its preview spot.
 */
function FurnitureInstances({ id, items, material }: { id: string; items: Item[]; material: THREE.Material }) {
  const { def, geometry, nodeMatrix } = useFurnitureMesh(id)
  const shadows = useRoomStore((s) => s.shadows)
  const drag = useRoomStore((s) => s.drag)
  const startDrag = useRoomStore((s) => s.startDrag)
  const ref = useRef<THREE.InstancedMesh>(null)
  const draggedIndex = drag?.index ?? -1

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    items.forEach(({ placement, index }, i) => {
      if (index === draggedIndex) return mesh.setMatrixAt(i, HIDDEN)
      const { position, rotationY } = toWorld(placement, def.size)
      mesh.setMatrixAt(i, placementMatrix(m, position, rotationY, nodeMatrix))
    })
    mesh.count = items.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items, def.size, nodeMatrix, draggedIndex])

  const previewMatrix = useMemo(() => {
    if (!drag || !items.some((it) => it.index === drag.index)) return null
    const { position, rotationY } = toWorld(drag.preview, def.size)
    return placementMatrix(new THREE.Matrix4(), position, rotationY, nodeMatrix, DRAG_LIFT)
  }, [drag, items, def.size, nodeMatrix])

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Looking at a room: presses go through to the floor, so dragging pans the view
    if (e.button !== 0 || e.instanceId === undefined || !useRoomStore.getState().editable) return
    e.stopPropagation()
    setDragPlaneHeight(e.point.y)
    const [cx, cy] = cellAtPoint(e.point, useRoomStore.getState().size)
    startDrag(items[e.instanceId].index, cx, cy)
  }

  return (
    <>
      <instancedMesh
        // Re-create when the count grows past the allocated buffer
        key={items.length}
        ref={ref}
        args={[geometry, material, items.length]}
        castShadow={shadows}
        receiveShadow={shadows}
        onPointerDown={onPointerDown}
        onPointerOver={() => {
          const s = useRoomStore.getState()
          if (s.editable && !s.drag) document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => !useRoomStore.getState().drag && (document.body.style.cursor = '')}
      />
      {previewMatrix && (
        <mesh
          geometry={geometry}
          material={material}
          matrixAutoUpdate={false}
          matrix={previewMatrix}
          castShadow={shadows}
          raycast={() => null}
        />
      )}
    </>
  )
}

function MarkLoaded({ id, expected }: { id: string; expected: number }) {
  useEffect(() => markFurnitureLoaded(id, expected), [id, expected])
  return null
}

export function FurnitureLayer() {
  const placements = useRoomStore((s) => s.placements)
  const material = usePaletteMaterial()
  const byId = useMemo(() => {
    const map = new Map<string, Item[]>()
    placements.forEach((placement, index) => {
      const list = map.get(placement.furnitureId) ?? []
      list.push({ placement, index })
      map.set(placement.furnitureId, list)
    })
    return map
  }, [placements])

  return (
    <>
      {/* Each type loads on its own, so pieces pop in one by one after the room outline */}
      {[...byId].map(([id, items]) => (
        <Suspense key={id} fallback={null}>
          <FurnitureInstances id={id} items={items} material={material} />
          <MarkLoaded id={id} expected={byId.size} />
        </Suspense>
      ))}
    </>
  )
}
