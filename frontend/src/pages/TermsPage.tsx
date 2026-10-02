import { useTerms } from '../api/queries'
import { navigate } from '../router'
import { Button } from '../ui/Button'

/** `/terms`, `/privacy`: the full text in force, for anyone. Signup shows the same text inside its dialog. */
export function TermsPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const terms = useTerms()
  const doc = terms.data?.find((t) => t.kind === kind)
  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <article className="card mx-auto max-w-2xl p-8">
        <Button size="sm" variant="ghost" onClick={() => navigate('/')}>처음으로</Button>
        {terms.isError && <p role="alert" className="mt-4 text-small text-danger">내용을 불러오지 못했어요</p>}
        {doc && (
          <>
            <h1 className="mt-4 text-title">{doc.title}</h1>
            <p className="mt-1 text-caption text-ink-soft">
              {doc.version}판 · {new Date(doc.effectiveAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} 시행
            </p>
            <div className="mt-6 text-small whitespace-pre-wrap">{doc.body}</div>
          </>
        )}
      </article>
    </div>
  )
}
