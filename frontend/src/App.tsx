import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { PerfProbe } from './debug/PerfProbe'
import { StatsCard } from './debug/StatsCard'
import { FurnitureLayer } from './furniture/Furniture'
import { CameraRig } from './room/CameraRig'
import { PlacementOverlay } from './room/PlacementOverlay'
import { ROOM_SIZE } from './room/placement'
import { Room } from './room/Room'
import { FLOORS, WALLS } from './room/surfaces'
import { layoutJsonOf, useRoomStore } from './store/roomStore'
import { Button } from './ui/Button'
import { FurniturePanel } from './ui/FurniturePanel'
import { SegmentedControl } from './ui/SegmentedControl'
import { SketchFilters } from './ui/SketchFilters'
import { Toast } from './ui/Toast'

function Lights() {
  const shadows = useRoomStore((s) => s.shadows)
  const c = ROOM_SIZE / 2
  return (
    <>
      <hemisphereLight args={['#fff6e8', '#c8a27a', 1.6]} />
      <directionalLight
        position={[c + 4, 7, c + 3]}
        intensity={1.8}
        color="#fff1dc"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      >
        <object3D attach="target" position={[c, 0, c]} />
      </directionalLight>
    </>
  )
}

function Controls({ className = '' }: { className?: string }) {
  const { floor, wall, shadows, setFloor, setWall, setShadows, save } = useRoomStore()
  const dirty = useRoomStore((s) => layoutJsonOf(s) !== s.savedJson)
  const stress = new URLSearchParams(window.location.search).get('stress')
  return (
    <section className={`card panel flex flex-col gap-4 ${className}`} aria-label="방 꾸미기">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title">방 꾸미기</h2>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-caption text-ink-soft">저장 안 됨</span>}
          <Button variant="primary" size="sm" onClick={save}>저장</Button>
        </div>
      </div>
      <div>
        <span className="field-label text-small">바닥</span>
        <SegmentedControl label="바닥" options={FLOORS} value={floor} onChange={setFloor} />
      </div>
      <div>
        <span className="field-label text-small">벽지</span>
        <SegmentedControl label="벽지" options={WALLS} value={wall} onChange={setWall} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShadows(!shadows)} aria-pressed={shadows}>
          그림자 {shadows ? '끄기' : '켜기'}
        </Button>
        {stress ? (
          <Button size="sm" variant="ghost" onClick={() => (window.location.search = '')}>기본 배치</Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => (window.location.search = '?stress=30')}>가구 30개</Button>
        )}
      </div>
    </section>
  )
}

/** R rotate, Delete/Backspace remove, Esc deselect. Ignored while typing in a field. */
function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      const s = useRoomStore.getState()
      if (e.key === 'r' || e.key === 'R') s.rotateSelected()
      else if (e.key === 'Delete' || e.key === 'Backspace') s.removeSelected()
      else if (e.key === 'Escape') s.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function App() {
  const shadows = useRoomStore((s) => s.shadows)
  useKeyboardShortcuts()
  return (
    <main className="relative h-full overflow-hidden">
      <Canvas className="absolute! inset-0" dpr={[1, 2]} flat shadows={shadows} gl={{ antialias: true }}>
        <CameraRig />
        <Lights />
        <Room />
        <Suspense fallback={null}>
          <FurnitureLayer />
        </Suspense>
        <PlacementOverlay />
        <PerfProbe />
      </Canvas>

      <header className="pointer-events-none absolute top-6 left-6">
        <h1 className="text-title">미니룸</h1>
        <p className="text-caption text-ink-soft">1단계 기술 검증</p>
      </header>
      <Controls className="absolute bottom-6 left-6" />
      <FurniturePanel className="absolute right-6 bottom-6" />
      <StatsCard className="absolute top-6 right-6 w-60" />
      <Toast />
      <SketchFilters />
    </main>
  )
}
