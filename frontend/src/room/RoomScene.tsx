import { Canvas } from '@react-three/fiber'
import { Suspense, useState } from 'react'
import { PerfProbe } from '../debug/PerfProbe'
import { FurnitureLayer } from '../furniture/Furniture'
import { useRoomStore } from '../store/roomStore'
import { CameraRig } from './CameraRig'
import { Island } from './Island'
import { LIGHTINGS, lightingFromUrl, type Lighting } from './lighting'
import { PlacementOverlay } from './PlacementOverlay'
import { roomMeters } from './placement'
import { Room } from './Room'

function Lights({ light }: { light: Lighting }) {
  const shadows = useRoomStore((s) => s.shadows)
  const c = roomMeters(useRoomStore((s) => s.size)) / 2
  return (
    <>
      <hemisphereLight args={[light.sky, light.ground, light.hemi]} />
      <directionalLight
        position={[c + 4, 7, c + 3]}
        intensity={light.sun}
        color="#fff1dc"
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
  // Read once: tone mapping is compiled into the materials, so a different draft means a reload
  const [light] = useState(() => LIGHTINGS[lightingFromUrl()])
  return (
    <Canvas
      className="absolute! inset-0"
      dpr={[1, 2]}
      flat
      shadows={shadows}
      gl={{ antialias: true }}
      // flat is the base (no tone mapping); a draft may switch it once the renderer exists
      onCreated={({ gl }) => {
        gl.toneMapping = light.toneMapping
        gl.toneMappingExposure = light.exposure
      }}
    >
      <CameraRig />
      <Lights light={light} />
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
