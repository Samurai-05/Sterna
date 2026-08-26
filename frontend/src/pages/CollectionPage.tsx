import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryCard } from '@/components/DiscoveryCard'
import { PageHeader } from '@/components/PageHeader'
import {
  categories,
  discoveries,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import { getDiscoveries } from '@/lib/api'

export function CollectionPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<DiscoveryCategory | null>(null)
  const { data: backendDiscoveries, isError, isLoading } = useQuery({
    queryKey: ['discoveries'],
    queryFn: getDiscoveries,
  })
  const sourceDiscoveries = backendDiscoveries ?? discoveries
  const filteredDiscoveries = useMemo(
    () =>
      sourceDiscoveries.filter(
        (discovery) =>
          (!category || discovery.category === category) &&
          discovery.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [category, query, sourceDiscoveries],
  )

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Your discoveries" />
      <div className="space-y-4 px-5">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/30">
          <Search className="size-4" />
          <span className="sr-only">Search discoveries</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your discoveries"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <CategoryButton
            active={category === null}
            onClick={() => setCategory(null)}
          >
            All
          </CategoryButton>
          {categories.map((item) => (
            <CategoryButton
              key={item.id}
              active={item.id === category}
              onClick={() => setCategory(item.id)}
            >
              <CategoryIcon category={item.id} className="size-4" />
              {item.label}
            </CategoryButton>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? 'Loading discoveries'
            : `${filteredDiscoveries.length} discoveries`}
        </p>
        {isError && (
          <p role="status" className="text-sm text-muted-foreground">
            Showing local sample discoveries.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {filteredDiscoveries.map((discovery) => (
            <DiscoveryCard key={discovery.id} discovery={discovery} />
          ))}
        </div>
      </div>
    </main>
  )
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-medium ${active ? 'border-primary bg-green-50 text-primary' : 'border-border bg-card text-foreground'}`}
    >
      {children}
    </button>
  )
}
