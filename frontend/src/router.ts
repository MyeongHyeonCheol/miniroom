import { useSyncExternalStore } from 'react'

/**
 * A few screens (docs/screens.md "주소") don't need a router library: the path is read from `location`
 * and changed with history.pushState. Back and forward fire popstate; our own navigation fires `navigate`.
 */
const EVENT = 'miniroom:navigate'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

const snapshot = () => window.location.pathname + window.location.search

/** Current path with its query, re-rendering on every navigation. */
export function useLocation(): { path: string; search: URLSearchParams } {
  const full = useSyncExternalStore(subscribe, snapshot)
  const url = new URL(full, window.location.origin)
  return { path: url.pathname, search: url.searchParams }
}

export function navigate(to: string, { replace = false } = {}) {
  if (to === snapshot()) return
  if (replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  window.dispatchEvent(new Event(EVENT))
}

/** `/r/k3x9m2qa` -> `k3x9m2qa`. Anything else under /r/ is a room that can't exist. */
export function roomSlugOf(path: string): string | null {
  const m = /^\/r\/([^/]+)\/?$/.exec(path)
  return m ? decodeURIComponent(m[1]) : null
}

export const roomPath = (slug: string) => `/r/${encodeURIComponent(slug)}`
