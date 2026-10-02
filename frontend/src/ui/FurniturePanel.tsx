import { FLOOR_CATALOG } from '../furniture/catalog'
import { useRoomStore } from '../store/roomStore'

/** Furniture list: a tile adds that piece at the first free spot. Spec: docs/design.md "가구 타일". */
export function FurniturePanel({ className = '' }: { className?: string }) {
  const count = useRoomStore((s) => s.placements.length)
  const limit = useRoomStore((s) => s.limit)
  const addFurniture = useRoomStore((s) => s.addFurniture)
  const full = count >= limit
  return (
    <section className={`card panel ${className}`} aria-label="가구">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-title">가구</h2>
        <span className="text-small text-ink-soft tabular-nums">{count} / {limit}</span>
      </div>
      {full && (
        <p className="mb-3 rounded-sm bg-accent-subtle px-3 py-2 text-small">
          가구는 {limit}개까지 놓을 수 있어요
        </p>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,88px)] gap-3">
        {FLOOR_CATALOG.map((f) => (
          <button key={f.id} type="button" className="tile" disabled={full} onClick={() => addFurniture(f.id)}>
            <span className="text-label">{f.name}</span>
            <span className="text-caption text-ink-soft">{f.size[0]}×{f.size[1]}칸</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-caption text-ink-soft">끌어서 옮기기 · R 회전 · Delete 삭제 · Esc 선택 해제</p>
    </section>
  )
}
