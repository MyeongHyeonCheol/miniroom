import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from './http'

/** GET /api/rooms/{slug} (docs/api.md). `layout` is the stored layout JSON, parsed by the room store. */
export type RoomData = {
  slug: string
  owner: { nickname: string | null }
  isMine: boolean
  size: number
  limits: { pieces: number; wallSlotsPerWall: number }
  layout: unknown
  visits: { today: number; total: number }
  updatedAt: string
}

export type Terms = { id: number; kind: 'terms' | 'privacy'; version: number; title: string; body: string; effectiveAt: string }

/** 404 is an answer (no such room), not something to retry. */
const noRetryOn404 = (count: number, e: unknown) => !(e instanceof ApiError && e.status === 404) && count < 1

export const roomKey = (slug: string) => ['room', slug] as const

export function useRoom(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: roomKey(slug),
    queryFn: () => api<RoomData>(`/api/rooms/${encodeURIComponent(slug)}`),
    enabled,
    retry: noRetryOn404,
  })
}

/** Owner nickname for the invite screen, before login. */
export function useInvite(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['invite', slug],
    queryFn: () => api<{ nickname: string | null }>(`/api/rooms/${encodeURIComponent(slug)}/invite`),
    enabled,
    retry: noRetryOn404,
  })
}

export function useTerms() {
  return useQuery({ queryKey: ['terms'], queryFn: () => api<Terms[]>('/api/terms'), staleTime: 5 * 60_000 })
}
