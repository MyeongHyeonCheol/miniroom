import { Button } from '../ui/Button'
import { useLogout, useMe } from './useMe'

/** Stage-1 login check: shows the Google email after login. Stage 3 shows the nickname instead (AGENTS.md). */
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
      <span className="text-small">{me.email}</span>
      <Button size="sm" variant="ghost" onClick={logout}>로그아웃</Button>
    </div>
  )
}
