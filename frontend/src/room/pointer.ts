import * as THREE from 'three'
import { cellAt } from './placement'

/**
 * Drag plane: a horizontal plane at the height where the piece was grabbed. Reading pointer moves
 * on this plane (not the floor) keeps the grabbed point under the cursor, even on a 1 m tall model.
 */
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()

export function setDragPlaneHeight(y: number) {
  plane.constant = -y
}

/** Cell under a world point (clamped to the room). */
export function cellAtPoint(p: THREE.Vector3): [number, number] {
  return cellAt(p.x, p.z)
}

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()

/** Cell under a DOM pointer position, read on the drag plane. Null if the ray misses it. */
export function cellFromClient(clientX: number, clientY: number, canvas: HTMLElement, camera: THREE.Camera) {
  const r = canvas.getBoundingClientRect()
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  return raycaster.ray.intersectPlane(plane, hit) ? cellAtPoint(hit) : null
}
