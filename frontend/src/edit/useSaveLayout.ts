import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, ApiError } from '../api/http'
import { roomKey, type RoomData } from '../api/queries'
import { toLayoutJson } from '../room/layoutJson'
import { useRoomStore } from '../store/roomStore'

/** What to say for each refusal code (docs/api.md PUT /api/rooms/me/layout). The pieces are marked in red too. */
const REFUSED: Record<string, (limit: number) => string> = {
  LAYOUT_OVERLAP: () => '겹친 가구가 있어요. 빨간 가구를 옮겨 주세요',
  LAYOUT_OUT_OF_ROOM: () => '방 밖으로 나간 가구가 있어요. 빨간 가구를 옮겨 주세요',
  LAYOUT_TOO_MANY: (limit) => `가구는 방에 ${limit}개까지 놓을 수 있어요`,
  LAYOUT_UNKNOWN_ID: () => '없는 가구가 있어요. 빨간 가구를 빼 주세요',
  LAYOUT_BAD_VALUE: () => '놓을 수 없는 가구가 있어요. 빨간 가구를 옮겨 주세요',
  LAYOUT_BAD_SLOT: () => '벽 장식 자리가 겹쳐요',
  LAYOUT_TOO_LARGE: () => '방이 너무 복잡해서 저장할 수 없어요. 가구를 조금 줄여 주세요',
  SIGNUP_REQUIRED: () => '가입을 마치면 저장할 수 있어요',
}

/**
 * PUT /api/rooms/me/layout with the editor's layout. The server checks all of it and saves all or nothing;
 * on a refusal the failing pieces (errors[].index, same order as the layout items) turn red.
 */
export function useSaveLayout(slug: string) {
  const client = useQueryClient()
  const [saving, setSaving] = useState(false)

  const save = async (): Promise<boolean> => {
    const store = useRoomStore.getState()
    setSaving(true)
    try {
      const room = await api<RoomData>('/api/rooms/me/layout', { method: 'PUT', body: toLayoutJson(store) })
      store.markSaved()
      // The room query now holds what the server stored, so going back to looking shows the same room
      client.setQueryData(roomKey(slug), room)
      store.notify('저장했어요')
      return true
    } catch (e) {
      if (e instanceof ApiError && REFUSED[e.code]) {
        store.setInvalid(e.errors.map((err) => err.index))
        store.notify(REFUSED[e.code](store.limit), 'error')
      } else {
        store.notify('저장하지 못했어요. 잠시 뒤에 다시 해 주세요', 'error')
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  return { save, saving }
}
