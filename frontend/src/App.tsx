import { DevRoomPage } from './pages/DevRoomPage'
import { HomePage } from './pages/HomePage'
import { RoomPage } from './pages/RoomPage'
import { TermsPage } from './pages/TermsPage'
import { navigate, roomSlugOf, useLocation } from './router'
import { Button } from './ui/Button'
import { SketchFilters } from './ui/SketchFilters'
import { Toast } from './ui/Toast'

function NotFound() {
  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <section className="card w-full max-w-sm p-7 text-center" aria-label="없는 주소">
        <h1 className="text-title">없는 주소예요</h1>
        <div className="mt-6 flex justify-center">
          <Button variant="primary" onClick={() => navigate('/')}>처음으로</Button>
        </div>
      </section>
    </div>
  )
}

/** Screens by address (docs/screens.md "주소"). */
function Screen() {
  const { path } = useLocation()
  const slug = roomSlugOf(path)
  if (path === '/') return <HomePage />
  if (slug) return <RoomPage key={slug} slug={slug} />
  if (path === '/terms') return <TermsPage kind="terms" />
  if (path === '/privacy') return <TermsPage kind="privacy" />
  if (import.meta.env.DEV && path === '/dev/room') return <DevRoomPage />
  return <NotFound />
}

export default function App() {
  return (
    <main className="room-sky relative h-full overflow-hidden">
      <Screen />
      <Toast />
      <SketchFilters />
    </main>
  )
}
