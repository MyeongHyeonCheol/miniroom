import { useQuery, useQueryClient } from '@tanstack/react-query'

type Me = { email: string }
export type MeState = { status: 'loading' } | { status: 'in'; email: string } | { status: 'out' } | { status: 'unavailable' }

/** 401 means logged out; anything else that fails (backend not running) hides the login area. */
async function fetchMe(): Promise<Me | null> {
  const res = await fetch('/api/me', { credentials: 'same-origin' })
  if (res.status === 401) return null
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
