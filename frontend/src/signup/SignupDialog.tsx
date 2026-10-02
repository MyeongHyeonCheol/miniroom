import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, ApiError } from '../api/http'
import { useTerms, type Terms } from '../api/queries'
import { ME_KEY, type Me } from '../auth/useMe'
import { navigate } from '../router'
import { useRoomStore } from '../store/roomStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

/** Same rule as the backend (Nicknames.java): 2 to 12 characters after trimming, counted as code points. */
const NICKNAME_MIN = 2
const NICKNAME_MAX = 12
const length = (s: string) => [...s.trim()].length

const ERRORS: Record<string, string> = {
  NICKNAME_INVALID: '닉네임은 2~12자로, 보이지 않는 글자 없이 지어 주세요',
  CONSENT_REQUIRED: '약관이 바뀌었어요. 내용을 다시 확인하고 동의해 주세요',
}

function TermsItem({ terms, checked, onChange }: { terms: Terms; checked: boolean; onChange: (v: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const id = `terms-${terms.id}`
  return (
    <div>
      <div className="flex items-center gap-3">
        <input id={id} type="checkbox" className="check" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={id} className="flex-1 cursor-pointer text-small">
          [필수] {terms.title}에 동의해요
        </label>
        <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? '접기' : '내용 보기'}
        </Button>
      </div>
      {open && (
        // Plain text from the server, rendered as text (AGENTS.md: no HTML from data)
        <div className="terms-box" tabIndex={0} aria-label={`${terms.title} 내용`}>{terms.body}</div>
      )}
    </div>
  )
}

/**
 * First signup over the room (2026-10-02 decisions): nickname, 14+ confirmation, and the terms read and agreed to
 * inside this dialog, not on another page. The agreed versions are recorded by the server (terms_agreements).
 */
export function SignupDialog({ onLater }: { onLater: () => void }) {
  const client = useQueryClient()
  const terms = useTerms()
  const [nickname, setNickname] = useState('')
  const [adult, setAdult] = useState(false)
  const [agreed, setAgreed] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [under14, setUnder14] = useState(false)

  const list = terms.data ?? []
  const allTerms = list.length > 0 && list.every((t) => agreed[t.id])
  const nicknameOk = length(nickname) >= NICKNAME_MIN && length(nickname) <= NICKNAME_MAX
  const ready = nicknameOk && adult && allTerms && !busy

  const setAll = (v: boolean) => {
    setAdult(v)
    setAgreed(Object.fromEntries(list.map((t) => [t.id, v])))
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const me = await api<Me>('/api/me', {
        method: 'PATCH',
        body: { nickname, ageConfirmed: true, agreedTermsIds: list.map((t) => t.id) },
      })
      client.setQueryData(ME_KEY, me)
      await client.invalidateQueries({ queryKey: ['room'] }) // the owner nickname shows up now
      useRoomStore.getState().notify(`${me.nickname}님, 반가워요!`)
    } catch (e) {
      const code = e instanceof ApiError ? e.code : ''
      setError(ERRORS[code] ?? '가입하지 못했어요. 잠시 뒤에 다시 해 주세요')
      if (code === 'CONSENT_REQUIRED') {
        setAgreed({})
        await terms.refetch()
      }
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    setBusy(true)
    await api('/api/me', { method: 'DELETE' }).catch(() => undefined)
    client.clear()
    navigate('/', { replace: true })
    useRoomStore.getState().notify('만 14세 미만은 가입할 수 없어서 계정을 지웠어요')
  }

  if (under14) {
    return (
      <Modal title="가입할 수 없어요" onClose={() => setUnder14(false)}>
        <p className="text-body">
          미니룸은 만 14세 이상만 가입할 수 있어요. 지금까지 만든 계정과 방을 지우고 나갈게요.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setUnder14(false)} disabled={busy}>돌아가기</Button>
          <Button variant="danger" onClick={leave} disabled={busy}>지우고 나가기</Button>
        </div>
      </Modal>
    )
  }

  const invalidNickname = nickname.length > 0 && !nicknameOk
  return (
    <Modal title="미니룸에 오신 걸 환영해요" onClose={onLater}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) void submit()
        }}
      >
        <div>
          <label htmlFor="nickname" className="field-label text-label">닉네임</label>
          <div className="field" data-invalid={invalidNickname}>
            <input
              id="nickname"
              value={nickname}
              maxLength={40}
              autoComplete="off"
              placeholder="친구들에게 보일 이름"
              aria-invalid={invalidNickname}
              aria-describedby="nickname-help"
              onChange={(e) => setNickname(e.target.value)}
            />
            <span className="field-count tabular-nums">{length(nickname)}/{NICKNAME_MAX}</span>
          </div>
          <p id="nickname-help" className={invalidNickname ? 'field-error' : 'mt-1 text-caption text-ink-soft'}>
            2~12자. Google 이름은 보이지 않아요
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-dashed border-border pt-4">
          <div className="flex items-center gap-3">
            <input id="all" type="checkbox" className="check" checked={adult && allTerms} onChange={(e) => setAll(e.target.checked)} />
            <label htmlFor="all" className="cursor-pointer text-label">모두 동의해요</label>
          </div>
          <div className="flex items-center gap-3">
            <input id="adult" type="checkbox" className="check" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            <label htmlFor="adult" className="flex-1 cursor-pointer text-small">[필수] 만 14세 이상이에요</label>
          </div>
          {terms.isPending && <p className="text-caption text-ink-soft">약관을 불러오는 중이에요</p>}
          {terms.isError && <p className="field-error">약관을 불러오지 못했어요. 새로고침해 주세요</p>}
          {list.map((t) => (
            <TermsItem key={t.id} terms={t} checked={Boolean(agreed[t.id])} onChange={(v) => setAgreed({ ...agreed, [t.id]: v })} />
          ))}
        </div>

        {error && <p role="alert" className="field-error">{error}</p>}

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setUnder14(true)}>만 14세 미만이에요</Button>
          <div className="flex gap-2">
            <Button onClick={onLater}>나중에</Button>
            <Button type="submit" variant="primary" disabled={!ready}>시작하기</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
