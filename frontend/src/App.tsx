import { Link, Route, Routes } from 'react-router'

import { Button } from '@/components/ui/button'
import { MapPage } from '@/pages/MapPage'

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">
        Temporary route used to validate the frontend foundation.
      </p>
    </main>
  )
}

function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Sterna frontend</h1>
      <p className="text-muted-foreground">
        Technical foundation: React Router, TanStack Query, Tailwind and
        shadcn/ui.
      </p>
      <div>
        <Button asChild>
          <Link to="/map">Open map smoke test</Link>
        </Button>
      </div>
    </main>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav
          aria-label="Temporary navigation"
          className="mx-auto flex w-full max-w-3xl gap-2 px-6 py-3"
        >
          <Button asChild size="sm" variant="ghost">
            <Link to="/">Home</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/map">Map</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/profile">Profile</Link>
          </Button>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
      </Routes>
    </div>
  )
}

export default App
