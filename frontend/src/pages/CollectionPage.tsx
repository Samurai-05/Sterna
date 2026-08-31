import { Grid2X2, List, MapPinned, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryCard } from '@/components/DiscoveryCard'
import { GalleryGroupFilter } from '@/components/GalleryGroupFilter'
import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { PoiCard } from '@/components/PoiCard'
import {
  getAuthoredDiscoveries,
  getGroupDiscoveries,
  getGroups,
  getPois,
} from '@/lib/api'
import {
  categoryAppearance,
  poiAppearance,
  type CategoryAppearance,
} from '@/lib/category-appearance'
import { discoveryPath } from '@/lib/discovery-path'
import {
  categories,
  discoveries,
  landmarks,
  type Discovery,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import { loadSession } from '@/lib/session'

type CollectionFilter = DiscoveryCategory | 'pois' | null
type GalleryView = 'detailed' | 'grid'

const EMPTY_DISCOVERIES: typeof discoveries = []
const EMPTY_POIS: typeof landmarks = []

export function CollectionPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CollectionFilter>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const session = loadSession()
  const selectedGroup = searchParams.get('group') ?? 'all'
  const selectedGroupId =
    selectedGroup === 'all' || selectedGroup === 'personal'
      ? null
      : selectedGroup
  const view: GalleryView =
    searchParams.get('view') === 'grid' ? 'grid' : 'detailed'
  const discoveriesQuery = useQuery({
    queryKey: ['discoveries', session?.user.id, 'authored'],
    queryFn: () => getAuthoredDiscoveries(session!.accessToken),
    enabled: Boolean(session),
  })
  const groupsQuery = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session),
  })
  const groups = groupsQuery.data ?? []
  const groupDiscoveriesQuery = useQuery({
    queryKey: ['group-discoveries', session?.user.id, selectedGroupId],
    queryFn: () => getGroupDiscoveries(session!.accessToken, selectedGroupId!),
    enabled: Boolean(session && selectedGroupId),
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
  const visibleDiscoveries = selectedGroupId
    ? (groupDiscoveriesQuery.data ?? EMPTY_DISCOVERIES)
    : sourceDiscoveries
  const filteredDiscoveries = useMemo(
    () =>
      visibleDiscoveries.filter(
        (discovery) =>
          category !== 'pois' &&
          (!category || discovery.category === category) &&
          discovery.name.toLowerCase().includes(normalizedQuery) &&
          (selectedGroup !== 'personal' ||
            isPersonalDiscovery(discovery, session?.user.id)),
      ),
    [
      category,
      normalizedQuery,
      selectedGroup,
      session?.user.id,
      visibleDiscoveries,
    ],
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
  const isLoading =
    discoveriesQuery.isLoading ||
    groupsQuery.isLoading ||
    groupDiscoveriesQuery.isLoading ||
    poisQuery.isLoading
  const isError =
    discoveriesQuery.isError ||
    groupsQuery.isError ||
    groupDiscoveriesQuery.isError ||
    poisQuery.isError
  const updateGalleryState = (
    updates: Partial<Record<'group' | 'view', string>>,
  ) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (
        !value ||
        (key === 'group' && value === 'all') ||
        (key === 'view' && value === 'detailed')
      ) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    })

    setSearchParams(next, { replace: true })
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="space-y-4 px-5 pt-4">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/30">
          <Search className="size-4" />
          <span className="sr-only">Search gallery</span>
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
        {category !== 'pois' && (
          <div className="flex items-center justify-between gap-3">
            <GalleryGroupFilter
              groups={groups}
              value={selectedGroup}
              onValueChange={(group) => updateGalleryState({ group })}
            />
            <button
              type="button"
              aria-label={
                view === 'grid'
                  ? 'Switch to detailed view'
                  : 'Switch to photo grid'
              }
              aria-pressed={view === 'grid'}
              onClick={() =>
                updateGalleryState({
                  view: view === 'grid' ? 'detailed' : 'grid',
                })
              }
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {view === 'grid' ? (
                <List className="size-4" aria-hidden="true" />
              ) : (
                <Grid2X2 className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? 'Loading gallery'
            : category === 'pois'
              ? formatCount(filteredPois.length, 'POI')
              : category
                ? formatCount(filteredDiscoveries.length, 'discovery')
                : `${formatCount(filteredDiscoveries.length, 'discovery')} · ${formatCount(filteredPois.length, 'POI')}`}
        </p>
        {isError && (
          <p role="status" className="text-sm text-muted-foreground">
            Unable to load part of your gallery.
          </p>
        )}
        {view === 'grid' && (
          <div className="-mx-5 grid grid-cols-3 gap-px">
            {filteredDiscoveries.map((discovery) => (
              <Link
                key={discovery.id}
                to={discoveryPath(discovery.id, selectedGroupId)}
                state={{ returnTo: `${location.pathname}${location.search}` }}
                className="aspect-square overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <DiscoveryPhoto
                  discovery={discovery}
                  alt={discovery.name}
                  width={480}
                  className="size-full object-cover"
                />
              </Link>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {view === 'detailed' &&
            filteredDiscoveries.map((discovery) => (
              <DiscoveryCard
                key={discovery.id}
                discovery={discovery}
                groupId={selectedGroupId ?? undefined}
              />
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

function isPersonalDiscovery(
  discovery: Discovery,
  currentUserId: string | undefined,
) {
  if (!currentUserId) return discovery.personal ?? !discovery.groupId

  return discovery.userId === currentUserId && discovery.personal === true
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
