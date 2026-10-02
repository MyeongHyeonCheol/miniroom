import { useRoomStore } from '../store/roomStore'
import { FLOOR_T, roomMeters, WALL_T } from './placement'

// docs/design.md "방 바깥 배경": the room floats on a block of grass and soil (default backdrop).
const GRASS = '#9CCF8A'
const SOIL = '#B0805A'
const SOIL_DARK = '#946645'
/** Grass rim around the room, in meters */
const PAD = 0.9

/** Grows with the room, so a widened room keeps the same rim. */
export function Island() {
  const meters = roomMeters(useRoomStore((s) => s.size))
  const w = meters + WALL_T + PAD * 2
  const c = (meters - WALL_T) / 2
  const top = -FLOOR_T
  return (
    <group>
      <mesh position={[c, top - 0.06, c]} raycast={() => null}>
        <boxGeometry args={[w, 0.12, w]} />
        <meshStandardMaterial color={GRASS} roughness={1} />
      </mesh>
      <mesh position={[c, top - 0.57, c]} raycast={() => null}>
        <boxGeometry args={[w - 0.1, 0.9, w - 0.1]} />
        <meshStandardMaterial color={SOIL} roughness={1} />
      </mesh>
      <mesh position={[c, top - 1.32, c]} raycast={() => null}>
        <boxGeometry args={[w - 0.8, 0.6, w - 0.8]} />
        <meshStandardMaterial color={SOIL_DARK} roughness={1} />
      </mesh>
    </group>
  )
}
