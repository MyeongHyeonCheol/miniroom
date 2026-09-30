import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { ROOM_BOUNDS, ROOM_SIZE } from './placement'

const YAW = Math.PI / 4 // 45 degrees around the room
const PITCH = (35 * Math.PI) / 180 // looking down
const DISTANCE = 20
/** Empty space around the room, as a fraction of the viewport */
const MARGIN = 0.08

/**
 * Fixed quarter view. The room box (floor slab to wall top) is projected to the screen, then the
 * camera is shifted to center it and zoomed so it fits with MARGIN on every side.
 */
export function CameraRig() {
  const ref = useRef<THREE.OrthographicCamera>(null)
  const size = useThree((s) => s.size)

  useLayoutEffect(() => {
    const cam = ref.current
    if (!cam) return
    const target = new THREE.Vector3(ROOM_SIZE / 2, 0, ROOM_SIZE / 2)
    cam.position.set(
      target.x + DISTANCE * Math.cos(PITCH) * Math.sin(YAW),
      target.y + DISTANCE * Math.sin(PITCH),
      target.z + DISTANCE * Math.cos(PITCH) * Math.cos(YAW),
    )
    cam.lookAt(target)
    cam.updateMatrixWorld()

    // Room corners in camera space (x right, y up)
    const box = new THREE.Box3()
    const [min, max] = ROOM_BOUNDS
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]])
          box.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse))

    // Center the box on screen by sliding the camera in its own plane
    const center = box.getCenter(new THREE.Vector3())
    cam.position.add(new THREE.Vector3(center.x, center.y, 0).applyQuaternion(cam.quaternion))

    const w = box.max.x - box.min.x
    const h = box.max.y - box.min.y
    cam.zoom = Math.min(size.width / w, size.height / h) * (1 - 2 * MARGIN)
    cam.updateProjectionMatrix()
  }, [size.width, size.height])

  return <OrthographicCamera ref={ref} makeDefault near={0.1} far={100} />
}
