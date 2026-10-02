import { Button } from '../ui/Button'
import { startLogin } from './login'
import { useLogout, useMe } from './useMe'

/** Login button, or the nickname and a logout button. Before signup the nickname is still empty. */
export function AuthBadge() {
  const me = useMe()
  const logout = useLogout()
  if (me.status === 'loading' || me.status === 'unavailable') return null
  if (me.status === 'out') return <LoginButton size="sm" />
  return (
    <div className="flex items-center gap-2">
      <span className="text-small">{me.nickname ?? '가입 전'}</span>
      <Button size="sm" variant="ghost" onClick={logout}>로그아웃</Button>
    </div>
  )
}

/** A real link (works without JS too), but remembers this page first so login comes back here. */
export function LoginButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'md' ? '' : `btn-${size}`
  return (
    <a
      href="/oauth2/authorization/google"
      className={`btn btn-primary ${sizeClass}`}
      onClick={(e) => {
        e.preventDefault()
        startLogin()
      }}
    >
      Google로 로그인
    </a>
  )
}
