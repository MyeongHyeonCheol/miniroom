/**
 * Google login leaves the page, and the backend always sends the browser back to `/`. Before leaving, the page
 * remembers where the user was (docs/screens.md "2. 로그인"); `/` reads it once and goes back there.
 */
const KEY = 'miniroom.returnTo'

export function startLogin(returnTo = window.location.pathname + window.location.search) {
  try {
    sessionStorage.setItem(KEY, returnTo)
  } catch {
    // storage blocked: the user lands on their own room instead
  }
  window.location.assign('/oauth2/authorization/google')
}

/** The remembered path, once. Only same-site paths, so a crafted value can't send the user elsewhere. */
export function takeReturnTo(): string | null {
  let value: string | null = null
  try {
    value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch {
    return null
  }
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}
