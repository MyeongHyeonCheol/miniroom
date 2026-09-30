import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { markFirstFrame, usePerfStore } from './perf'

const SAMPLE_MS = 500

/**
 * Inside <Canvas>: samples fps and renderer.info twice a second.
 * renderer.info resets every frame, so the values read here describe the previous frame.
 */
export function PerfProbe() {
  const gl = useThree((s) => s.gl)
  const acc = useRef({ frames: 0, start: 0 })

  useFrame(() => {
    markFirstFrame()
    const a = acc.current
    a.frames++
    const now = performance.now()
    if (a.start === 0) a.start = now
    const elapsed = now - a.start
    if (elapsed >= SAMPLE_MS) {
      const info = gl.info
      usePerfStore.setState({
        fps: Math.round((a.frames * 1000) / elapsed),
        frameMs: Math.round((elapsed / a.frames) * 10) / 10,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      })
      a.frames = 0
      a.start = now
    }
  })
  return null
}
