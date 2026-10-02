import { useEffect } from 'react'
import { StatsCard } from '../debug/StatsCard'
import { RoomScene } from '../room/RoomScene'
import { FLOORS, WALLS } from '../room/surfaces'
import { useLocation } from '../router'
import { layoutJsonOf, useRoomStore } from '../store/roomStore'
import { Button } from '../ui/Button'
import { FurniturePanel } from '../ui/FurniturePanel'
import { SegmentedControl } from '../ui/SegmentedControl'

function Controls({ className = '' }: { className?: string }) {
  const { floor, wall, shadows, setFloor, setWall, setShadows, save } = useRoomStore()
  const dirty = useRoomStore((s) => layoutJsonOf(s) !== s.savedJson)
  const { search } = useLocation()
  const stress = search.get('stress')
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

/**
 * `/dev/room` (development server only): the stage-1 playground. Editable, saved in this browser, with the
 * measurement card. `npm run measure` and the placement e2e tests use it; ?grid=16, ?stress=30, ?shadows=1.
 * The real editor (week 3) moves this onto `/r/{slug}?edit` with saving to the API.
 */
export function DevRoomPage() {
  const { search } = useLocation()
  const query = search.toString()
  useKeyboardShortcuts()
  useEffect(() => {
    useRoomStore.getState().loadPlayground(new URLSearchParams(query))
  }, [query])
  return (
    <>
      <RoomScene />
      <header className="pointer-events-none absolute top-6 left-6">
        <h1 className="text-title">미니룸</h1>
        <p className="text-caption text-ink-soft">개발용 놀이터</p>
      </header>
      <Controls className="absolute bottom-6 left-6" />
      <FurniturePanel className="absolute right-6 bottom-6" />
      <StatsCard className="absolute top-6 right-6 w-60" />
    </>
  )
}
