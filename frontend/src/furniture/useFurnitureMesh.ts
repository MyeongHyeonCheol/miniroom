import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { CATALOG_BY_ID } from './catalog'

/**
 * The single mesh of a furniture glb, plus the node transform it needs.
 * gltf-transform quantizes positions and moves the dequantization scale/offset into the node
 * transform, so `nodeMatrix` must be applied after the placement transform.
 */
export function useFurnitureMesh(id: string) {
  const def = CATALOG_BY_ID.get(id)!
  const { scene } = useGLTF(def.glb)
  return useMemo(() => {
    let mesh: THREE.Mesh | null = null
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
    })
    if (!mesh) throw new Error(`No mesh in ${def.glb}`)
    const found = mesh as THREE.Mesh
    const nodeMatrix = found.matrixWorld.clone()
    found.geometry.computeBoundingBox()
    const height = found.geometry.boundingBox!.clone().applyMatrix4(nodeMatrix).max.y
    return { def, geometry: found.geometry, nodeMatrix, height }
  }, [scene, def])
}

const up = new THREE.Vector3(0, 1, 0)
const one = new THREE.Vector3(1, 1, 1)

/** World matrix for a model placed at `position` / `rotationY`, `lift` meters above the floor. */
export function placementMatrix(
  out: THREE.Matrix4,
  position: readonly [number, number, number],
  rotationY: number,
  nodeMatrix: THREE.Matrix4,
  lift = 0,
) {
  const q = new THREE.Quaternion().setFromAxisAngle(up, rotationY)
  return out
    .compose(new THREE.Vector3(position[0], position[1] + lift, position[2]), q, one)
    .multiply(nodeMatrix)
}
