import { layoutJsonOf, useRoomStore } from '../store/roomStore'
import { usePerfStore } from './perf'

const fmt = (ms: number | null) => (ms === null ? '…' : `${(ms / 1000).toFixed(2)}초`)

/** Measurement overlay for stage-1 technical validation. */
export function StatsCard({ className = '' }: { className?: string }) {
  const s = usePerfStore()
  const pieces = useRoomStore((r) => r.placements.length)
  const limit = useRoomStore((r) => r.limit)
  const jsonBytes = useRoomStore((r) => new Blob([layoutJsonOf(r)]).size)
  const rows: [string, string, string?][] = [
    ['가구', `${pieces}개`, `한도 ${limit}`],
    ['fps', `${s.fps}`, `${s.frameMs}ms`],
    ['드로우콜', `${s.drawCalls}`, '한도 100'],
    ['삼각형', s.triangles.toLocaleString()],
    ['지오메트리 / 텍스처', `${s.geometries} / ${s.textures}`],
    ['첫 화면', fmt(s.firstFrameMs)],
    ['가구 로딩 완료', fmt(s.furnitureReadyMs), '한도 3초'],
    ['배치 JSON', `${(jsonBytes / 1024).toFixed(1)}KB`, '한도 10KB'],
  ]
  return (
    <section className={`card ${className}`} aria-label="측정">
      <h2 className="mb-3 text-heading">측정</h2>
      <dl className="grid gap-2">
        {rows.map(([k, v, hint]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-small text-ink-soft">{k}</dt>
            <dd className="text-right text-label tabular-nums" data-stat={k}>
              {v}
              {hint && <span className="block text-caption text-ink-soft">{hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
