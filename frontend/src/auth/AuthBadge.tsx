import { Button } from '../ui/Button'
import { useLogout, useMe } from './useMe'

/** Login state. Before signup the nickname is still empty; the signup form over the room comes with week 2. */
export function AuthBadge() {
  const me = useMe()
  const logout = useLogout()
  if (me.status === 'loading' || me.status === 'unavailable') return null
  if (me.status === 'out') {
    return (
      <a href="/oauth2/authorization/google" className="btn btn-primary btn-sm mt-3">
        Google로 로그인
      </a>
    )
  }
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-small">{me.nickname ?? '가입 전'}</span>
      <Button size="sm" variant="ghost" onClick={logout}>로그아웃</Button>
    </div>
  )
}
