import { MapPinned, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryCard } from '@/components/DiscoveryCard'
import { PageHeader } from '@/components/PageHeader'
import { PoiCard } from '@/components/PoiCard'
import { getDiscoveries, getPois } from '@/lib/api'
import {
  categoryAppearance,
  poiAppearance,
  type CategoryAppearance,
} from '@/lib/category-appearance'
import {
  categories,
  discoveries,
  landmarks,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import { loadSession } from '@/lib/session'

type CollectionFilter = DiscoveryCategory | 'pois' | null
const EMPTY_DISCOVERIES: typeof discoveries = []
const EMPTY_POIS: typeof landmarks = []

export function CollectionPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CollectionFilter>(null)
  const session = loadSession()
  const discoveriesQuery = useQuery({
    queryKey: ['discoveries', session?.user.id],
    queryFn: () => getDiscoveries(session!.accessToken),
    enabled: Boolean(session),
  })
  const poisQuery = useQuery({
    queryKey: ['pois', session?.user.id],
    queryFn: () => getPois(session!.accessToken),
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  })
  const sourceDiscoveries =
    discoveriesQuery.data ?? (session ? EMPTY_DISCOVERIES : discoveries)
  const sourcePois = poisQuery.data ?? (session ? EMPTY_POIS : landmarks)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredDiscoveries = useMemo(
    () =>
      sourceDiscoveries.filter(
        (discovery) =>
          category !== 'pois' &&
          (!category || discovery.category === category) &&
          discovery.name.toLowerCase().includes(normalizedQuery),
      ),
    [category, normalizedQuery, sourceDiscoveries],
  )
  const filteredPois = useMemo(
    () =>
      sourcePois.filter(
        (poi) =>
          poi.discovered &&
          (!category || category === 'pois') &&
          poi.name.toLowerCase().includes(normalizedQuery),
      ),
    [category, normalizedQuery, sourcePois],
  )
  const isLoading = discoveriesQuery.isLoading || poisQuery.isLoading
  const isError = discoveriesQuery.isError || poisQuery.isError

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Your discoveries" />
      <div className="space-y-4 px-5">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/30">
          <Search className="size-4" />
          <span className="sr-only">Search collection</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search discoveries and POIs"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              appearance={categoryAppearance[item.id]}
            >
              <CategoryIcon category={item.id} className="size-4" />
              {item.label}
            </CategoryButton>
          ))}
          <CategoryButton
            active={category === 'pois'}
            onClick={() => setCategory('pois')}
            appearance={poiAppearance}
          >
            <MapPinned className={`size-4 ${poiAppearance.icon}`} />
            POIs
          </CategoryButton>
        </div>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? 'Loading collection'
            : category === 'pois'
              ? formatCount(filteredPois.length, 'POI')
              : category
                ? formatCount(filteredDiscoveries.length, 'discovery')
                : `${formatCount(filteredDiscoveries.length, 'discovery')} · ${formatCount(filteredPois.length, 'POI')}`}
        </p>
        {isError && (
          <p role="status" className="text-sm text-muted-foreground">
            Unable to load part of your collection.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {filteredDiscoveries.map((discovery) => (
            <DiscoveryCard key={discovery.id} discovery={discovery} />
          ))}
          {filteredPois.map((poi) => (
            <PoiCard key={poi.id} poi={poi} />
          ))}
        </div>
      </div>
    </main>
  )
}

function formatCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function CategoryButton({
  active,
  onClick,
  appearance,
  children,
}: {
  active: boolean
  onClick: () => void
  appearance?: Pick<CategoryAppearance, 'background' | 'ring'>
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-medium text-foreground transition-colors ${
        appearance
          ? active
            ? `${appearance.background} border-transparent ring-2 ${appearance.ring}`
            : 'border-border bg-card'
          : active
            ? 'border-primary bg-green-50 text-primary'
            : 'border-border bg-card'
      }`}
    >
      {children}
    </button>
  )
}
