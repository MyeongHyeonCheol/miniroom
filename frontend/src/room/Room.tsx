import { useMemo } from 'react'
import * as THREE from 'three'
import { useRoomStore } from '../store/roomStore'
import { CELL, FLOOR_T, roomMeters, WALL_H, WALL_T } from './placement'
import { surfaceTexture } from './surfaces'

const BASEBOARD_H = 0.08

/** Floor, two walls (back: z = 0, left: x = 0) with baseboards, and faint cell lines. */
export function Room() {
  const floor = useRoomStore((s) => s.floor)
  const wall = useRoomStore((s) => s.wall)
  const shadows = useRoomStore((s) => s.shadows)
  const select = useRoomStore((s) => s.select)
  const side = useRoomStore((s) => s.size)
  const meters = roomMeters(side)

  const floorTex = surfaceTexture('floor', floor, [side / 2, side / 2])
  const wallTex = surfaceTexture('wall', wall, [side / 2, 2.4])
  const half = meters / 2

  const gridGeometry = useMemo(() => {
    const pts: number[] = []
    for (let i = 1; i < side; i++) {
      pts.push(i * CELL, 0.002, 0, i * CELL, 0.002, meters)
      pts.push(0, 0.002, i * CELL, meters, 0.002, i * CELL)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [side, meters])

  return (
    <group>
      {/* floor slab */}
      <mesh position={[half, -FLOOR_T / 2, half]} receiveShadow={shadows} onPointerDown={() => select(null)}>
        <boxGeometry args={[meters, FLOOR_T, meters]} />
        <meshStandardMaterial map={floorTex} roughness={0.9} />
      </mesh>
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#6b4428" transparent opacity={0.12} />
      </lineSegments>

      {/* back wall (along X) and left wall (along Z), meeting at the corner */}
      <mesh position={[half - WALL_T / 2, WALL_H / 2 - FLOOR_T, -WALL_T / 2]} receiveShadow={shadows}>
        <boxGeometry args={[meters + WALL_T, WALL_H, WALL_T]} />
        <meshStandardMaterial map={wallTex} roughness={0.95} />
      </mesh>
      <mesh position={[-WALL_T / 2, WALL_H / 2 - FLOOR_T, half]} receiveShadow={shadows}>
        <boxGeometry args={[WALL_T, WALL_H, meters]} />
        <meshStandardMaterial map={wallTex} roughness={0.95} />
      </mesh>

      {/* baseboards */}
      <mesh position={[half, BASEBOARD_H / 2, 0.01]}>
        <boxGeometry args={[meters, BASEBOARD_H, 0.02]} />
        <meshStandardMaterial color="#9c6b43" roughness={0.8} />
      </mesh>
      <mesh position={[0.01, BASEBOARD_H / 2, half]}>
        <boxGeometry args={[0.02, BASEBOARD_H, meters]} />
        <meshStandardMaterial color="#9c6b43" roughness={0.8} />
      </mesh>
    </group>
  )
}
