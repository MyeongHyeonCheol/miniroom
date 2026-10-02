import { useEffect, useRef } from 'react'
import { LoginButton } from '../auth/AuthBadge'
import { takeReturnTo } from '../auth/login'
import { useMe } from '../auth/useMe'
import { RoomScene } from '../room/RoomScene'
import { navigate, roomPath, useLocation } from '../router'
import { useRoomStore } from '../store/roomStore'

/**
 * `/` (docs/screens.md): logged in -> back to where the login started, else my room. Logged out -> a short
 * intro with Google login over the default first room (a real 3D sample, screens.md open question 1).
 */
export function HomePage() {
  const me = useMe()
  const { search } = useLocation()
  const loginFailed = search.get('login') === 'failed'

  // The remembered page is taken once (StrictMode runs effects twice; the second run must not send us to /)
  const done = useRef(false)

  // Cancelled or failed at Google: say so, and go back to the page the login started from
  useEffect(() => {
    if (!loginFailed || done.current) return
    done.current = true
    useRoomStore.getState().notify('로그인하지 못했어요. 다시 시도해 주세요', 'error')
    navigate(takeReturnTo() ?? '/', { replace: true })
  }, [loginFailed])

  const mySlug = me.status === 'in' ? me.mySlug : null
  useEffect(() => {
    if (!mySlug || done.current) return
    done.current = true
    navigate(takeReturnTo() ?? roomPath(mySlug), { replace: true })
  }, [mySlug])

  useEffect(() => {
    useRoomStore.getState().showSample()
  }, [])

  if (me.status === 'in' || me.status === 'loading') return null
  return (
    <>
      <RoomScene />
      <div className="pointer-events-none absolute inset-0 grid place-items-center p-4">
        <section className="card pointer-events-auto w-full max-w-sm p-7 text-center" aria-label="미니룸 소개">
          <h1 className="text-display">미니룸</h1>
          <p className="mt-3 text-body text-ink-soft">
            내 방을 꾸미고, 친구 방에 놀러 가 방명록을 남겨요.
          </p>
          {me.status === 'unavailable' ? (
            <p role="alert" className="mt-6 text-small text-danger">서버에 연결할 수 없어요. 잠시 뒤에 다시 와 주세요</p>
          ) : (
            <div className="mt-6 flex justify-center">
              <LoginButton size="lg" />
            </div>
          )}
        </section>
      </div>
    </>
  )
}
