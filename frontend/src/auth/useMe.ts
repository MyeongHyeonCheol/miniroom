import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api, ApiError } from '../api/http'
import { useRoomStore } from '../store/roomStore'

/** GET /api/me (docs/api.md). No email: public screens show the nickname only. */
export type Me = { nickname: string | null; needsSignup: boolean; mySlug: string; newGuestbookCount: number }
export type MeState = { status: 'loading' } | ({ status: 'in' } & Me) | { status: 'out' } | { status: 'unavailable' }

export const ME_KEY = ['me'] as const

/**
 * 401 means logged out; anything else that fails (backend not running) is "unavailable".
 * 401 with code REPLACED: the account logged in elsewhere and this session was ended (one login per account).
 */
async function fetchMe(): Promise<Me | null> {
  try {
    return await api<Me>('/api/me')
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e
    if (e.code === 'REPLACED') useRoomStore.getState().notify('다른 곳에서 로그인해서 여기서는 로그아웃됐어요', 'error')
    return null
  }
}

/** While logged in and visible, check every 30 s: a login elsewhere ends this tab within 30 s, not at the next click. */
const RECHECK_MS = 30_000

export function useMe(): MeState {
  const q = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    retry: false,
    // Only while logged in; TanStack pauses the interval while the tab is hidden
    refetchInterval: (query) => (query.state.data ? RECHECK_MS : false),
  })
  const loggedIn = Boolean(q.data)
  const { refetch } = q
  // Coming back to this window (another window had the focus, or the tab was hidden): check right away.
  // The app turns off refetchOnWindowFocus, and TanStack's own check ignores switching between windows.
  useEffect(() => {
    if (!loggedIn) return
    const recheck = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      window.removeEventListener('focus', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [loggedIn, refetch])
  if (q.isPending) return { status: 'loading' }
  if (q.isError) return { status: 'unavailable' }
  return q.data ? { status: 'in', ...q.data } : { status: 'out' }
}

/** Spring Security logout: POST with the CSRF header. Everything cached about the user goes with it. */
export function useLogout() {
  const client = useQueryClient()
  return async () => {
    await api('/logout', { method: 'POST' }).catch(() => undefined)
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    await client.invalidateQueries({ queryKey: ME_KEY })
  }
}
