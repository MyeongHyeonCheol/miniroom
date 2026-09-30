import { useEffect, useState } from 'react'
import { useRoomStore } from '../store/roomStore'

const SHOW_MS = 3000

/** Bottom-center message from the room store. Spec: docs/design.md "토스트 Toast". */
export function Toast() {
  const notice = useRoomStore((s) => s.notice)
  const [expiredId, setExpiredId] = useState<number | null>(null)

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setExpiredId(notice.id), SHOW_MS)
    return () => clearTimeout(t)
  }, [notice])

  if (!notice || expiredId === notice.id) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
      <div key={notice.id} role="status" className={`toast toast-${notice.tone}`}>
        <span className="toast-dot" aria-hidden />
        {notice.text}
      </div>
    </div>
  )
}
