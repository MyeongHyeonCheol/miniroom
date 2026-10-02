import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Centered card over a dimmed page. Spec: docs/design.md "모달". Focus moves into it on open;
 * Escape calls onClose when the modal may be closed.
 */
export function Modal({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>('input, button, [tabindex]')
    first?.focus()
  }, [])

  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="card modal">
        <h2 id={titleId} className="mb-5 text-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}
