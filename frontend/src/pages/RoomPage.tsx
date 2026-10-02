import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../api/http'
import { useInvite, useRoom } from '../api/queries'
import { AuthBadge, LoginButton } from '../auth/AuthBadge'
import { useMe } from '../auth/useMe'
import { StatsCard } from '../debug/StatsCard'
import { EditPanel, LeaveDialog } from '../edit/EditPanel'
import { RoomScene } from '../room/RoomScene'
import { navigate, roomPath, useLocation } from '../router'
import { SignupDialog } from '../signup/SignupDialog'
import { isDirty, useRoomStore } from '../store/roomStore'
import { Button } from '../ui/Button'

/** A card in the middle of the sky, for screens without a room behind them. */
function CenterCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <section className="card w-full max-w-sm p-7 text-center" aria-label={label}>{children}</section>
    </div>
  )
}

/** Logged out (docs/screens.md "1. 방 보기"): whose room this is, and login that comes back here. */
function InviteScreen({ slug }: { slug: string }) {
  const invite = useInvite(slug, true)
  if (invite.isPending) return null
  if (invite.error instanceof ApiError && invite.error.status === 404) return <RoomNotFound />
  const nickname = invite.data?.nickname
  return (
    <CenterCard label="초대">
      <h1 className="text-heading break-keep text-balance">{nickname ? `${nickname}님의 미니룸에 초대받았어요` : '미니룸에 초대받았어요'}</h1>
      <p className="mt-3 text-body text-ink-soft">로그인하면 방에 들어가 방명록을 남길 수 있어요.</p>
      <div className="mt-6 flex justify-center">
        <LoginButton size="lg" />
      </div>
    </CenterCard>
  )
}

function RoomNotFound({ mySlug }: { mySlug?: string }) {
  return (
    <CenterCard label="방 없음">
      <h1 className="text-title">방을 찾을 수 없어요</h1>
      <p className="mt-3 text-body text-ink-soft">주소가 맞는지 확인해 주세요.</p>
      <div className="mt-6 flex justify-center">
        <Button variant="primary" onClick={() => navigate(mySlug ? roomPath(mySlug) : '/')}>
          {mySlug ? '내 방으로' : '처음으로'}
        </Button>
      </div>
    </CenterCard>
  )
}

/**
 * Logged in: the room as saved, the owner's nickname, and the signup form over it until signup is done.
 * My room with `?edit` (and signup done) is the editor (docs/screens.md "4. 꾸미기 모드").
 */
function RoomView({ slug, mySlug, needsSignup }: { slug: string; mySlug: string; needsSignup: boolean }) {
  const room = useRoom(slug, true)
  const { search } = useLocation()
  const [signupLater, setSignupLater] = useState(false)
  const [askLeave, setAskLeave] = useState(false)
  const isMine = room.data?.isMine ?? false
  const wantsEdit = search.has('edit')
  const editing = wantsEdit && isMine && !needsSignup
  const viewPath = roomPath(slug)
  const editPath = `${viewPath}?edit`

  const dirty = useRoomStore(isDirty)
  // Left edit mode with the back button while there are unsaved changes: the edits stay until the user decides
  const showLeave = askLeave || (!editing && dirty)

  // Before the first paint of the scene, so the previous room never flashes. Unsaved edits are never wiped (by a
  // refetch or by leaving edit mode); after a save the new data is the same layout, so the editor carries on.
  useLayoutEffect(() => {
    if (!room.data) return
    const s = useRoomStore.getState()
    if (isDirty(s)) return
    s.showRoom(room.data.size, room.data.layout, room.data.limits.pieces)
    if (editing) s.startEditing()
  }, [room.data, editing])

  // ?edit on someone else's room, or before signup: just look
  useEffect(() => {
    if (wantsEdit && room.data && !editing) navigate(viewPath, { replace: true })
  }, [wantsEdit, editing, room.data, viewPath])

  const leave = () => {
    setAskLeave(false)
    useRoomStore.getState().stopEditing()
    navigate(viewPath)
  }
  const stay = () => {
    setAskLeave(false)
    navigate(editPath)
  }

  if (room.error instanceof ApiError && room.error.status === 404) return <RoomNotFound mySlug={mySlug} />
  if (room.isError) {
    return (
      <CenterCard label="오류">
        <h1 className="text-title">방을 불러오지 못했어요</h1>
        <div className="mt-6 flex justify-center">
          <Button variant="primary" onClick={() => room.refetch()}>다시 시도</Button>
        </div>
      </CenterCard>
    )
  }
  if (!room.data) return null

  const owner = room.data.owner.nickname
  return (
    <>
      <RoomScene />
      <header className="pointer-events-none absolute top-6 left-6">
        <h1 className="text-title">{owner ? `${owner}님의 미니룸` : room.data.isMine ? '내 미니룸' : '미니룸'}</h1>
        <div className="pointer-events-auto mt-3 flex gap-2">
          {!room.data.isMine && (
            <Button size="sm" onClick={() => navigate(roomPath(mySlug))}>내 방 가보기</Button>
          )}
          {room.data.isMine && !needsSignup && !editing && (
            <Button size="sm" variant="primary" onClick={() => navigate(editPath)}>꾸미기</Button>
          )}
        </div>
      </header>
      {editing && <EditPanel slug={slug} onLeave={() => (dirty ? setAskLeave(true) : leave())} />}
      {showLeave && <LeaveDialog onStay={stay} onLeave={leave} />}
      {search.get('debug') === '1' && <StatsCard className="absolute top-6 right-6 mt-14 w-60" />}
      {needsSignup && !signupLater && <SignupDialog onLater={() => setSignupLater(true)} />}
    </>
  )
}

/** `/r/{slug}`: login is required to look (2026-10-01), signup is not (the form sits over the room). */
export function RoomPage({ slug }: { slug: string }) {
  const me = useMe()
  return (
    <>
      {me.status === 'out' && <InviteScreen slug={slug} />}
      {me.status === 'in' && <RoomView slug={slug} mySlug={me.mySlug} needsSignup={me.needsSignup} />}
      {me.status === 'unavailable' && (
        <CenterCard label="오류">
          <h1 className="text-title">서버에 연결할 수 없어요</h1>
          <p className="mt-3 text-body text-ink-soft">잠시 뒤에 다시 와 주세요.</p>
        </CenterCard>
      )}
      {me.status === 'in' && (
        <div className="absolute top-6 right-6">
          <AuthBadge />
        </div>
      )}
    </>
  )
}
