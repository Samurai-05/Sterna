import { Grid2X2 } from 'lucide-react'
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router'

import { DiscoveryCard } from '@/components/DiscoveryCard'
import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { PoiCard } from '@/components/PoiCard'
import {
  getAuthoredDiscoveries,
  getGroupDiscoveries,
  getGroups,
  getPois,
} from '@/lib/api'
import { discoveryPath } from '@/lib/discovery-path'
import { discoveries, landmarks, type Discovery } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'

const EMPTY_DISCOVERIES: typeof discoveries = []
const EMPTY_POIS: typeof landmarks = []
type GalleryTab = 'discoveries' | 'pois'
type GalleryView = 'detailed' | 'grid'
type DiscoveryEntry = {
  discovery: Discovery
  groupIds: string[]
  detailGroupId?: string
}

export function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const session = loadSession()
  const location = useLocation()
  const tab: GalleryTab =
    searchParams.get('tab') === 'pois' ? 'pois' : 'discoveries'
  const view: GalleryView =
    searchParams.get('view') === 'grid' ? 'grid' : 'detailed'
  const selectedGroup = searchParams.get('group') ?? 'all'
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
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data])
  const groupDiscoveriesQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ['group-discoveries', session?.user.id, group.id],
      queryFn: () => getGroupDiscoveries(session!.accessToken, group.id),
      enabled: Boolean(session),
    })),
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
  const discoveryEntries = useMemo(() => {
    const entries = new Map<number, DiscoveryEntry>()

    sourceDiscoveries
      .filter(isPersonalDiscovery)
      .forEach((discovery) =>
        entries.set(discovery.id, {
          discovery,
          groupIds: discovery.groupIds ?? [],
        }),
      )

    groups.forEach((group, index) => {
      const groupDiscoveries = groupDiscoveriesQueries[index]?.data ?? []
      groupDiscoveries.forEach((discovery) => {
        const existing = entries.get(discovery.id)
        if (existing) {
          if (!existing.groupIds.includes(group.id)) {
            existing.groupIds.push(group.id)
          }
        } else {
          entries.set(discovery.id, {
            discovery,
            groupIds: [group.id],
            detailGroupId: group.id,
          })
        }
      })
    })

    return [...entries.values()]
  }, [groupDiscoveriesQueries, groups, sourceDiscoveries])
  const filteredDiscoveries = useMemo(() => {
    if (selectedGroup === 'personal') {
      return discoveryEntries.filter(({ discovery }) =>
        isPersonalDiscovery(discovery),
      )
    }

    if (selectedGroup === 'all') return discoveryEntries

    return discoveryEntries.filter(({ groupIds }) =>
      groupIds.includes(selectedGroup),
    )
  }, [discoveryEntries, selectedGroup])
  const filteredPois = useMemo(
    () => sourcePois.filter((poi) => poi.discovered),
    [sourcePois],
  )
  const isLoading =
    tab === 'discoveries'
      ? discoveriesQuery.isLoading ||
        groupsQuery.isLoading ||
        groupDiscoveriesQueries.some((query) => query.isLoading)
      : poisQuery.isLoading
  const isError =
    tab === 'discoveries'
      ? discoveriesQuery.isError ||
        groupsQuery.isError ||
        groupDiscoveriesQueries.some((query) => query.isError)
      : poisQuery.isError
  const setGalleryState = (
    updates: Partial<Record<'tab' | 'group' | 'view', string>>,
  ) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (
        !value ||
        (key === 'tab' && value === 'discoveries') ||
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
    <main className="min-h-dvh bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="space-y-3 px-4 pt-3">
        <div
          role="tablist"
          aria-label="Gallery content"
          className="grid grid-cols-2 rounded-xl bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'discoveries'}
            onClick={() => setGalleryState({ tab: 'discoveries' })}
            className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors ${tab === 'discoveries' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
          >
            Discoveries
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pois'}
            onClick={() => setGalleryState({ tab: 'pois' })}
            className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors ${tab === 'pois' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
          >
            POIs
          </button>
        </div>
        {tab === 'discoveries' && (
          <div className="flex items-center justify-between gap-3">
            <label className="min-w-0">
              <span className="sr-only">Filter discoveries by group</span>
              <select
                aria-label="Filter discoveries by group"
                value={selectedGroup}
                onChange={(event) =>
                  setGalleryState({ group: event.target.value })
                }
                className="h-10 w-full max-w-52 truncate rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="all">All</option>
                <option value="personal">Personal</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-label={
                view === 'grid'
                  ? 'Switch to detailed view'
                  : 'Switch to photo grid'
              }
              aria-pressed={view === 'grid'}
              onClick={() =>
                setGalleryState({ view: view === 'grid' ? 'detailed' : 'grid' })
              }
              className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <Grid2X2 className="size-5" aria-hidden="true" />
            </button>
          </div>
        )}
        <p className="text-sm text-muted-foreground" role="status">
          {isLoading
            ? 'Loading gallery'
            : tab === 'pois'
              ? formatCount(filteredPois.length, 'POI')
              : formatCount(filteredDiscoveries.length, 'discovery')}
        </p>
        {isError && (
          <p role="status" className="text-sm text-muted-foreground">
            Unable to load part of your gallery.
          </p>
        )}
        {tab === 'discoveries' &&
          (view === 'grid' ? (
            <div className="-mx-4 grid grid-cols-3 gap-px">
              {filteredDiscoveries.map(({ discovery, detailGroupId }) => (
                <Link
                  key={discovery.id}
                  to={discoveryPath(discovery.id, detailGroupId)}
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
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredDiscoveries.map(({ discovery, detailGroupId }) => (
                <DiscoveryCard
                  key={discovery.id}
                  discovery={discovery}
                  groupId={detailGroupId}
                />
              ))}
            </div>
          ))}
        {tab === 'pois' && (
          <div className="grid grid-cols-2 gap-3">
            {filteredPois.map((poi) => (
              <PoiCard key={poi.id} poi={poi} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function formatCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function isPersonalDiscovery(discovery: Discovery) {
  return discovery.personal ?? !discovery.groupId
}
