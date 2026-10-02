/**
 * Same-origin JSON calls to the backend (docs/api.md). Errors come back as ProblemDetail with a `code`
 * (docs/api.md "오류 형식"); the screen picks its wording from the code, never from `detail`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: { index: number; code: string }[]

  constructor(status: number, code: string, detail: string, errors: { index: number; code: string }[] = []) {
    super(detail)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

function readCookie(name: string): string | undefined {
  return document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1)
}

/** Spring Security's SPA CSRF: echo the XSRF-TOKEN cookie in a header on every write. */
export function csrfHeaders(): Record<string, string> {
  const token = readCookie('XSRF-TOKEN')
  return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? 'GET'
  const headers: Record<string, string> = method === 'GET' ? {} : csrfHeaders()
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, body?.code ?? `HTTP_${res.status}`, body?.detail ?? res.statusText, body?.errors ?? [])
  }
  return body as T
}
