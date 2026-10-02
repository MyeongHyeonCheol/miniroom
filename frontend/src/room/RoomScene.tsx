import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { PerfProbe } from '../debug/PerfProbe'
import { FurnitureLayer } from '../furniture/Furniture'
import { useRoomStore } from '../store/roomStore'
import { CameraRig } from './CameraRig'
import { Island } from './Island'
import { LIGHT } from './lighting'
import { PlacementOverlay } from './PlacementOverlay'
import { roomMeters } from './placement'
import { Room } from './Room'

function Lights() {
  const shadows = useRoomStore((s) => s.shadows)
  const c = roomMeters(useRoomStore((s) => s.size)) / 2
  return (
    <>
      <hemisphereLight args={[LIGHT.sky, LIGHT.ground, LIGHT.hemi]} />
      <directionalLight
        position={[c + 4, 7, c + 3]}
        intensity={LIGHT.sun}
        color={LIGHT.sunColor}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-c - 1}
        shadow-camera-right={c + 1}
        shadow-camera-top={c + 1}
        shadow-camera-bottom={-c - 1}
        shadow-bias={-0.0005}
      >
        <object3D attach="target" position={[c, 0, c]} />
      </directionalLight>
    </>
  )
}

/**
 * The room as the store holds it: shell and island first, furniture as its models arrive
 * (AGENTS.md: first screen in 3 s, outline first). Fills its positioned parent.
 */
export function RoomScene() {
  const shadows = useRoomStore((s) => s.shadows)
  return (
    // flat: no tone mapping, so the palette colors stay exact (lighting.ts)
    <Canvas className="absolute! inset-0" dpr={[1, 2]} flat shadows={shadows} gl={{ antialias: true }}>
      <CameraRig />
      <Lights />
      <Room />
      <Island />
      <Suspense fallback={null}>
        <FurnitureLayer />
      </Suspense>
      <PlacementOverlay />
      <PerfProbe />
    </Canvas>
  )
}
