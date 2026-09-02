import {
  ArrowRight,
  Clock3,
  Compass,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { useActiveMap } from '@/hooks/useActiveMap'
import {
  getDiscoveries,
  getGroupDiscoveries,
  getPois,
  searchLocations,
} from '@/lib/api'
import type { MapTarget } from '@/lib/map-target'
import { defaultMapViewport, getStoredMapViewport } from '@/lib/map-viewport'
import {
  clearRecentSearches,
  loadRecentSearches,
  saveRecentSearch,
  type RecentSearch,
} from '@/lib/recent-searches'
import { loadSession } from '@/lib/session'
import { personalMapName } from '@/lib/personal-map-name'
import { getCurrentDevicePosition } from '@/lib/device-location'

type SearchResult = RecentSearch

interface NearbyResult extends SearchResult {
  distanceKm: number
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const navigate = useNavigate()
  const session = loadSession()
  const userId = session?.user.id ?? ''
  const [recentSearches, setRecentSearches] = useState(() =>
    userId ? loadRecentSearches(userId) : [],
  )
  const [nearbyOrigin, setNearbyOrigin] = useState<[number, number]>(
    () => getStoredMapViewport()?.center ?? defaultMapViewport.center,
  )
  const { data: activeMap } = useActiveMap()
  const activeGroupId = activeMap?.groupId ?? null

  useEffect(() => {
    const normalized = query.trim()
    const timer = window.setTimeout(
      () => setDebouncedQuery(normalized.length >= 2 ? normalized : ''),
      450,
    )
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    void getCurrentDevicePosition({
      enableHighAccuracy: false,
      maximumAge: 5 * 60 * 1000,
      timeout: 5000,
    }).then(
      ({ coords }) => setNearbyOrigin([coords.longitude, coords.latitude]),
      () => undefined,
    )
  }, [])

  const discoveriesQuery = useQuery({
    queryKey: activeGroupId
      ? ['group-discoveries', session?.user.id, activeGroupId]
      : ['discoveries', session?.user.id],
    queryFn: () =>
      activeGroupId
        ? getGroupDiscoveries(session!.accessToken, activeGroupId)
        : getDiscoveries(session!.accessToken),
    enabled: Boolean(session),
  })
  const poisQuery = useQuery({
    queryKey: ['pois', session?.user.id],
    queryFn: () => getPois(session!.accessToken),
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  })
  const placesQuery = useQuery({
    queryKey: ['location-search', debouncedQuery],
    queryFn: () => searchLocations(session!.accessToken, debouncedQuery),
    enabled: Boolean(session && debouncedQuery),
    staleTime: 5 * 60 * 1000,
  })

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const activeMapLabel =
    activeMap?.name ?? personalMapName(session?.user.userName)
  const results = useMemo<SearchResult[]>(() => {
    if (normalizedQuery.length < 2) return []

    const discoveries = (discoveriesQuery.data ?? [])
      .filter((discovery) =>
        discovery.name.toLocaleLowerCase().includes(normalizedQuery),
      )
      .map((discovery) => ({
        id: `discovery:${discovery.id}`,
        kind: 'discovery' as const,
        label: discovery.name,
        detail: `Discovery · ${activeMapLabel}`,
        coordinates: discovery.coordinates,
        zoom: 16,
      }))

    const pois = (poisQuery.data ?? [])
      .filter(
        (poi) =>
          poi.name.toLocaleLowerCase().includes(normalizedQuery) ||
          poi.description.toLocaleLowerCase().includes(normalizedQuery),
      )
      .map((poi) => ({
        id: `poi:${poi.id}`,
        kind: 'poi' as const,
        label: poi.name,
        detail: 'Point of interest',
        coordinates: poi.coordinates,
        zoom: 16,
      }))

    const places = (placesQuery.data ?? []).map((place) => ({
      id: `place:${place.id}`,
      kind: 'place' as const,
      label: place.label,
      detail: humanizeType(place.type),
      coordinates: [place.longitude, place.latitude] as [number, number],
      zoom: place.zoom,
    }))

    return [...discoveries, ...pois, ...places]
  }, [
    activeMapLabel,
    discoveriesQuery.data,
    normalizedQuery,
    placesQuery.data,
    poisQuery.data,
  ])

  const nearbyResults = useMemo<NearbyResult[]>(() => {
    const candidates: SearchResult[] = [
      ...(poisQuery.data ?? []).map((poi) => ({
        id: `poi:${poi.id}`,
        kind: 'poi' as const,
        label: poi.name,
        detail: poi.discovered
          ? 'Previously visited point of interest'
          : 'Point of interest to explore',
        coordinates: poi.coordinates,
        zoom: 16,
      })),
      ...(discoveriesQuery.data ?? []).map((discovery) => ({
        id: `discovery:${discovery.id}`,
        kind: 'discovery' as const,
        label: discovery.name,
        detail: 'Previous discovery',
        coordinates: discovery.coordinates,
        zoom: 16,
      })),
    ]

    return candidates
      .map((candidate) => ({
        ...candidate,
        distanceKm: distanceInKilometres(nearbyOrigin, candidate.coordinates),
      }))
      .filter((candidate) => candidate.distanceKm <= 50)
      .sort((left, right) => left.distanceKm - right.distanceKm)
      .slice(0, 5)
  }, [discoveriesQuery.data, nearbyOrigin, poisQuery.data])

  function selectResult(result: SearchResult) {
    if (userId) {
      setRecentSearches(saveRecentSearch(userId, result))
    }
    navigate('/', {
      state: {
        mapTarget: {
          coordinates: result.coordinates,
          zoom: result.zoom,
          label: result.label,
        } satisfies MapTarget,
      },
    })
  }

  const isSearching = Boolean(debouncedQuery && placesQuery.isFetching)

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Search a place" backTo="/" />
      <div className="space-y-4 px-5">
        <label className="flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:ring-2 focus-within:ring-ring/30">
          <Search className="size-5 text-muted-foreground" />
          <span className="sr-only">Search a place</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Country, city, village, POI or discovery"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        {normalizedQuery.length < 2 ? (
          <div className="space-y-6">
            <section aria-labelledby="recent-searches-heading">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2
                  id="recent-searches-heading"
                  className="text-sm font-semibold"
                >
                  Recent searches
                </h2>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (userId) clearRecentSearches(userId)
                      setRecentSearches([])
                    }}
                    className="min-h-11 px-1 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:rounded-md"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {recentSearches.map((result) => (
                  <ResultButton
                    key={result.id}
                    result={result}
                    icon={<Clock3 className="size-4" />}
                    onSelect={selectResult}
                  />
                ))}
                {recentSearches.length === 0 && (
                  <p className="px-4 py-5 text-sm text-muted-foreground">
                    Places you select will appear here.
                  </p>
                )}
              </div>
            </section>

            <section aria-labelledby="explore-nearby-heading">
              <div className="mb-2">
                <h2
                  id="explore-nearby-heading"
                  className="text-sm font-semibold"
                >
                  Explore nearby
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Nearby POIs and previous discoveries, closest first.
                </p>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {nearbyResults.map((result) => (
                  <ResultButton
                    key={result.id}
                    result={{
                      ...result,
                      detail: `${result.detail} · ${formatDistance(result.distanceKm)}`,
                    }}
                    icon={<Navigation className="size-4" />}
                    onSelect={selectResult}
                  />
                ))}
                {nearbyResults.length === 0 && (
                  <p className="px-4 py-5 text-sm text-muted-foreground">
                    No POI or previous discovery found within 50 km.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <section
            aria-label="Place results"
            className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
          >
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => selectResult(result)}
                className="flex min-h-16 w-full items-center gap-3 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {result.kind === 'place' ? (
                    <Compass className="size-4" />
                  ) : (
                    <MapPin className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm font-medium">
                    {result.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {result.detail}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-primary" />
              </button>
            ))}
            {!isSearching && results.length === 0 && (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                No matching place or discovery found.
              </p>
            )}
            {isSearching && (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Searching places…
              </p>
            )}
          </section>
        )}

        {placesQuery.isError && (
          <p role="status" className="text-sm text-destructive">
            Online place search is temporarily unavailable. Discoveries and
            local POIs can still be searched.
          </p>
        )}
        <p className="pb-5 text-xs text-muted-foreground">
          Place data ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            OpenStreetMap contributors
          </a>
        </p>
      </div>
    </main>
  )
}

function humanizeType(type: string): string {
  return type
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function ResultButton({
  result,
  icon,
  onSelect,
}: {
  result: SearchResult
  icon: React.ReactNode
  onSelect: (result: SearchResult) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex min-h-16 w-full items-center gap-3 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-medium">
          {result.label}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {result.detail}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-primary" />
    </button>
  )
}

function distanceInKilometres(
  from: [number, number],
  to: [number, number],
): number {
  const earthRadiusKm = 6371
  const latitudeDelta = toRadians(to[1] - from[1])
  const longitudeDelta = toRadians(to[0] - from[0])
  const fromLatitude = toRadians(from[1])
  const toLatitude = toRadians(to[1])
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1)
    return `${Math.max(1, Math.round(distanceKm * 1000))} m away`
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km away`
  return `${Math.round(distanceKm)} km away`
}
