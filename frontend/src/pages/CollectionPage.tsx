import { Grid2X2, List, MapPinned, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryCard } from '@/components/DiscoveryCard'
import {
  ALL_GROUPS,
  GalleryGroupFilter,
  PERSONAL_MAP,
} from '@/components/GalleryGroupFilter'
import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { PoiCard } from '@/components/PoiCard'
import {
  getAllGroupDiscoveries,
  getDiscoveries,
  getGroupDiscoveries,
  getGroups,
  getPois,
  type GroupSummary,
} from '@/lib/api'
import {
  categoryAppearance,
  poiAppearance,
  type CategoryAppearance,
} from '@/lib/category-appearance'
import { discoveryPath } from '@/lib/discovery-path'
import { getPoiImageUrl } from '@/lib/poi-image'
import {
  loadGalleryView,
  saveGalleryView,
  type GalleryView,
} from '@/lib/gallery-view'
import { discoveryLocationLabel } from '@/lib/location-label'
import {
  categories,
  discoveries,
  landmarks,
  type Discovery,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import { loadSession } from '@/lib/session'
import { personalMapName } from '@/lib/personal-map-name'

type CollectionFilter = DiscoveryCategory | 'pois' | null

const EMPTY_DISCOVERIES: typeof discoveries = []
const EMPTY_POIS: typeof landmarks = []

export function CollectionPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CollectionFilter>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const session = loadSession()
  const requestedSource = searchParams.get('group')
  const selectedGroup = normalizeGallerySource(requestedSource)
  const selectedGroupId =
    selectedGroup === PERSONAL_MAP || selectedGroup === ALL_GROUPS
      ? null
      : selectedGroup
  const view: GalleryView =
    searchParams.get('view') === 'grid'
      ? 'grid'
      : loadGalleryView(session?.user.id)
  const personalDiscoveriesQuery = useQuery({
    queryKey: ['discoveries', session?.user.id],
    queryFn: () => getDiscoveries(session!.accessToken),
    enabled: Boolean(session && selectedGroup === PERSONAL_MAP),
  })
  const groupsQuery = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session),
  })
  const groups = groupsQuery.data ?? []
  const allGroupDiscoveriesQuery = useQuery({
    queryKey: ['group-discoveries', session?.user.id, ALL_GROUPS],
    queryFn: () => getAllGroupDiscoveries(session!.accessToken),
    enabled: Boolean(session && selectedGroup === ALL_GROUPS),
  })
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
  const sourcePois = poisQuery.data ?? (session ? EMPTY_POIS : landmarks)
  const normalizedQuery = query.trim().toLowerCase()
  const activeDiscoveriesQuery = selectedGroupId
    ? groupDiscoveriesQuery
    : selectedGroup === ALL_GROUPS
      ? allGroupDiscoveriesQuery
      : personalDiscoveriesQuery
  const visibleDiscoveries =
    activeDiscoveriesQuery.data ?? (session ? EMPTY_DISCOVERIES : discoveries)
  const filteredDiscoveries = useMemo(
    () =>
      visibleDiscoveries.filter(
        (discovery) =>
          category !== 'pois' &&
          (!category || discovery.category === category) &&
          discovery.name.toLowerCase().includes(normalizedQuery),
      ),
    [category, normalizedQuery, visibleDiscoveries],
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
    activeDiscoveriesQuery.isLoading ||
    groupsQuery.isLoading ||
    poisQuery.isLoading
  const isError =
    activeDiscoveriesQuery.isError || groupsQuery.isError || poisQuery.isError
  const updateGalleryState = (
    updates: Partial<Record<'group' | 'view', string>>,
  ) => {
    const next = new URLSearchParams(searchParams)

    if (updates.view === 'grid' || updates.view === 'detailed') {
      saveGalleryView(session?.user.id, updates.view)
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (
        !value ||
        (key === 'group' && value === PERSONAL_MAP) ||
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
      <div className="sterna-gallery-content space-y-4 px-5">
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
        <div className="flex items-center justify-between gap-3">
          {category !== 'pois' && (
            <GalleryGroupFilter
              groups={groups}
              value={selectedGroup}
              personalMapName={personalMapName(session?.user.userName)}
              onValueChange={(group) => updateGalleryState({ group })}
            />
          )}
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
            className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {view === 'grid' ? (
              <List className="size-4" aria-hidden="true" />
            ) : (
              <Grid2X2 className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
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
            {filteredDiscoveries.map((discovery) => {
              const discoveryGroupId = galleryDiscoveryGroupId(
                discovery,
                selectedGroup,
                selectedGroupId,
                groups,
              )
              const showAuthor =
                Boolean(session) && discovery.userId !== session?.user.id

              return (
                <Link
                  key={discovery.id}
                  to={discoveryPath(discovery.id, discoveryGroupId)}
                  state={{ returnTo: `${location.pathname}${location.search}` }}
                  className="relative aspect-square overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <DiscoveryPhoto
                    discovery={discovery}
                    alt={discovery.name}
                    width={480}
                    className="size-full object-cover"
                  />
                  {showAuthor && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5 text-xs font-medium text-white">
                      {discovery.author}
                    </span>
                  )}
                </Link>
              )
            })}
            {filteredPois.map((poi) => (
              <Link
                key={poi.id}
                to={`/landmarks/${poi.id}`}
                state={{ returnTo: `${location.pathname}${location.search}` }}
                className="aspect-square overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <img
                  src={getPoiImageUrl(poi.imageUrl, poi.imageId, 'card')}
                  alt={poi.name}
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {view === 'detailed' &&
            filteredDiscoveries.map((discovery) => {
              const discoveryGroupId = galleryDiscoveryGroupId(
                discovery,
                selectedGroup,
                selectedGroupId,
                groups,
              )

              return (
                <DiscoveryCard
                  key={discovery.id}
                  discovery={discovery}
                  groupId={discoveryGroupId}
                  locationLabel={discoveryLocationLabel(discovery)}
                />
              )
            })}
          {view === 'detailed' &&
            filteredPois.map((poi) => <PoiCard key={poi.id} poi={poi} />)}
        </div>
      </div>
    </main>
  )
}

function formatCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function normalizeGallerySource(source: string | null) {
  // Keep old shared/bookmarked Gallery URLs useful after replacing All and
  // Personal with source-oriented filters.
  if (!source || source === 'all' || source === 'mine') return PERSONAL_MAP

  return source
}

function galleryDiscoveryGroupId(
  discovery: Discovery,
  selectedSource: string,
  selectedGroupId: string | null,
  groups: GroupSummary[],
) {
  if (selectedGroupId) return selectedGroupId
  if (selectedSource !== ALL_GROUPS) return undefined

  const membershipIds = new Set(groups.map((group) => group.id))

  return discovery.groupIds?.find((groupId) => membershipIds.has(groupId))
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
