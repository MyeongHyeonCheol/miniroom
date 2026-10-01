import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRoomStore } from '../store/roomStore'

type Me = { email: string }
export type MeState = { status: 'loading' } | { status: 'in'; email: string } | { status: 'out' } | { status: 'unavailable' }

/**
 * 401 means logged out; anything else that fails (backend not running) hides the login area.
 * 401 {"reason":"replaced"}: the account logged in elsewhere and this session was ended (one login per account).
 */
async function fetchMe(): Promise<Me | null> {
  const res = await fetch('/api/me', { credentials: 'same-origin' })
  if (res.status === 401) {
    const body = await res.json().catch(() => null)
    if (body?.reason === 'replaced') useRoomStore.getState().notify('다른 곳에서 로그인해서 여기서는 로그아웃됐어요', 'error')
    return null
  }
  if (!res.ok) throw new Error(`/api/me ${res.status}`)
  return res.json()
}

export function useMe(): MeState {
  const q = useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false })
  if (q.isPending) return { status: 'loading' }
  if (q.isError) return { status: 'unavailable' }
  return q.data ? { status: 'in', email: q.data.email } : { status: 'out' }
}

function readCookie(name: string): string | undefined {
  return document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1)
}

/** Spring Security logout: POST with the XSRF-TOKEN cookie echoed in a header. */
export function useLogout() {
  const client = useQueryClient()
  return async () => {
    const token = readCookie('XSRF-TOKEN')
    await fetch('/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {},
    })
    await client.invalidateQueries({ queryKey: ['me'] })
  }
}
