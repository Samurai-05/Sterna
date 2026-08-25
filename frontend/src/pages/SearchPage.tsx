import { ArrowRight, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/PageHeader'

const places = [
  'Paris, France',
  'Le Marais, Paris',
  'Montmartre, Paris',
  'Louvre Museum, Paris',
]

export function SearchPage() {
  const [query, setQuery] = useState('')
  const results = places.filter((place) =>
    place.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Search a place" backTo="/" />
      <div className="space-y-5 px-5">
        <label className="flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:ring-2 focus-within:ring-ring/30">
          <Search className="size-5 text-muted-foreground" />
          <span className="sr-only">Search a place</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="City, region or place"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <section
          aria-label="Place results"
          className="divide-y divide-border rounded-2xl border border-border bg-card"
        >
          {results.map((place) => (
            <Link
              key={place}
              to="/"
              className="flex min-h-14 items-center justify-between gap-3 px-4 text-sm font-medium"
            >
              <span>{place}</span>
              <ArrowRight className="size-4 text-primary" />
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
