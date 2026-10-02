import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { useRoomStore } from '../store/roomStore'
import { roomBounds, roomMeters } from './placement'

const YAW = Math.PI / 4 // 45 degrees around the room
const PITCH = (35 * Math.PI) / 180 // looking down
const DISTANCE = 20
/** Empty space around the room, as a fraction of the viewport */
const MARGIN = 0.08
// Pan and zoom limits. Zoom is relative to the "whole room fits" zoom.
const ZOOM_MIN = 0.8
const ZOOM_MAX = 4
/** Pan limit as a fraction of the room side */
const PAN_LIMIT = 0.6

/**
 * Fixed quarter view. The room box (floor slab to wall top) is projected to the screen, then the
 * camera is shifted to center it and zoomed so it fits with MARGIN on every side.
 * Drag empty space to pan (in the camera plane), wheel to zoom. A press on furniture drags the piece instead.
 */
export function CameraRig() {
  const ref = useRef<THREE.OrthographicCamera>(null)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const side = useRoomStore((s) => s.size)
  const meters = roomMeters(side)
  const view = useRef({ base: new THREE.Vector3(), fitZoom: 1, pan: new THREE.Vector2(), zoom: 1, panLimit: 1 })

  const apply = () => {
    const cam = ref.current
    if (!cam) return
    const v = view.current
    v.pan.clampScalar(-v.panLimit, v.panLimit)
    v.zoom = THREE.MathUtils.clamp(v.zoom, ZOOM_MIN, ZOOM_MAX)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion)
    cam.position.copy(v.base).addScaledVector(right, v.pan.x).addScaledVector(up, v.pan.y)
    cam.zoom = v.fitZoom * v.zoom
    cam.updateProjectionMatrix()
  }

  useLayoutEffect(() => {
    const cam = ref.current
    if (!cam) return
    const target = new THREE.Vector3(meters / 2, 0, meters / 2)
    cam.position.set(
      target.x + DISTANCE * Math.cos(PITCH) * Math.sin(YAW),
      target.y + DISTANCE * Math.sin(PITCH),
      target.z + DISTANCE * Math.cos(PITCH) * Math.cos(YAW),
    )
    cam.lookAt(target)
    cam.updateMatrixWorld()

    // Room corners in camera space (x right, y up)
    const box = new THREE.Box3()
    const [min, max] = roomBounds(side)
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]])
          box.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse))

    // Center the box on screen by sliding the camera in its own plane
    const center = box.getCenter(new THREE.Vector3())
    cam.position.add(new THREE.Vector3(center.x, center.y, 0).applyQuaternion(cam.quaternion))

    const w = box.max.x - box.min.x
    const h = box.max.y - box.min.y
    view.current.base.copy(cam.position)
    view.current.panLimit = PAN_LIMIT * meters
    view.current.fitZoom = Math.min(size.width / w, size.height / h) * (1 - 2 * MARGIN)
    apply()
  }, [size.width, size.height, side, meters])

  useEffect(() => {
    const el = gl.domElement
    let last: { x: number; y: number } | null = null

    const down = (e: PointerEvent) => {
      // R3F's own listener runs first: if the press grabbed a piece, it is a furniture drag
      if (e.button !== 0 || useRoomStore.getState().drag) return
      last = { x: e.clientX, y: e.clientY }
    }
    const move = (e: PointerEvent) => {
      if (!last || !ref.current) return
      if (useRoomStore.getState().drag) return void (last = null)
      const cam = ref.current
      view.current.pan.x -= (e.clientX - last.x) / cam.zoom
      view.current.pan.y += (e.clientY - last.y) / cam.zoom
      last = { x: e.clientX, y: e.clientY }
      el.style.cursor = 'grabbing'
      apply()
    }
    const up = () => {
      last = null
      el.style.cursor = ''
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      view.current.zoom *= Math.exp(-e.deltaY * 0.0015)
      apply()
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  return <OrthographicCamera ref={ref} makeDefault near={0.1} far={100} />
}
