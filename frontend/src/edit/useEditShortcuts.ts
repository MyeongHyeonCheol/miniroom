import { useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'

/** R rotate, Delete/Backspace remove, Esc deselect. Ignored while typing in a field. */
export function useEditShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      const s = useRoomStore.getState()
      if (!s.editable) return
      if (e.key === 'r' || e.key === 'R') s.rotateSelected()
      else if (e.key === 'Delete' || e.key === 'Backspace') s.removeSelected()
      else if (e.key === 'Escape') s.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** While there are unsaved changes, the browser asks before reloading or closing the tab. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
