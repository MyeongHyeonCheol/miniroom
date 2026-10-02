import { useEffect } from 'react'
import { StatsCard } from '../debug/StatsCard'
import { SurfacePicker } from '../edit/SurfacePicker'
import { useEditShortcuts } from '../edit/useEditShortcuts'
import { RoomScene } from '../room/RoomScene'
import { useLocation } from '../router'
import { layoutJsonOf, useRoomStore } from '../store/roomStore'
import { Button } from '../ui/Button'
import { FurniturePanel } from '../ui/FurniturePanel'

function Controls({ className = '' }: { className?: string }) {
  const { shadows, setShadows, saveToBrowser } = useRoomStore()
  const dirty = useRoomStore((s) => layoutJsonOf(s) !== s.savedJson)
  const { search } = useLocation()
  const stress = search.get('stress')
  return (
    <section className={`card panel flex flex-col gap-4 ${className}`} aria-label="방 꾸미기">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title">방 꾸미기</h2>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-caption text-ink-soft">저장 안 됨</span>}
          <Button variant="primary" size="sm" onClick={saveToBrowser}>저장</Button>
        </div>
      </div>
      <SurfacePicker />
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

/**
 * `/dev/room` (development server only): the stage-1 playground. Editable, saved in this browser, with the
 * measurement card. `npm run measure` and the placement e2e tests use it; ?grid=16, ?stress=30, ?shadows=1.
 * The real editor (week 3) moves this onto `/r/{slug}?edit` with saving to the API.
 */
export function DevRoomPage() {
  const { search } = useLocation()
  const query = search.toString()
  useEditShortcuts()
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
