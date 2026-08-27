import { LocateFixed, Search, UsersRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { MapCanvas, type MapCanvasHandle } from '@/components/MapCanvas'
import { MapSwitcherSheet } from '@/components/MapSwitcherSheet'
import { Button } from '@/components/ui/button'
import {
  categories,
  discoveries,
  landmarks,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import {
  getDiscoveries,
  getGroupDiscoveries,
  getGroups,
  getPois,
} from '@/lib/api'
import { discoveryPath } from '@/lib/discovery-path'
import {
  activeMapName,
  useActiveMap,
  useSetActiveMap,
} from '@/hooks/useActiveMap'
import type { DiscoveryRouteState } from '@/lib/route-state'
import { loadSession } from '@/lib/session'

export function MapPage({ active }: { active: boolean }) {
  const [activeCategory, setActiveCategory] =
    useState<DiscoveryCategory | null>(null)
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const mapRef = useRef<MapCanvasHandle>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])
  useEffect(() => {
    if (active) {
      mapRef.current?.resize()
    }
  }, [active])
  const session = loadSession()
  const userInitial =
    session?.user.userName.trim().charAt(0).toUpperCase() || '?'
  const {
    data: activeMap,
    isError: isActiveMapError,
    isPending: isLoadingActiveMap,
  } = useActiveMap()
  const setActiveMap = useSetActiveMap()
  const activeGroupId = activeMap?.groupId ?? null
  const { data: groups } = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session),
  })
  // The map renders whichever destination is active: the personal map, or the
  // group's shared map with every member's discoveries.
  const { data: backendDiscoveries, isError: isDiscoveriesError } = useQuery({
    queryKey: activeGroupId
      ? ['group-discoveries', session?.user.id, activeGroupId]
      : ['discoveries', session?.user.id],
    queryFn: () =>
      activeGroupId
        ? getGroupDiscoveries(session!.accessToken, activeGroupId)
        : getDiscoveries(session!.accessToken),
    enabled: Boolean(session) && !isLoadingActiveMap,
  })
  const { data: backendPois, isError: isPoisError } = useQuery({
    queryKey: ['pois', session?.user.id],
    queryFn: () => getPois(session!.accessToken),
    enabled: Boolean(session) && !isLoadingActiveMap,
  })
  const sourceDiscoveries = useMemo(
    () =>
      backendDiscoveries ??
      (isDiscoveriesError && (activeGroupId === null || isActiveMapError)
        ? discoveries
        : []),
    [activeGroupId, backendDiscoveries, isActiveMapError, isDiscoveriesError],
  )
  const sourceLandmarks = useMemo(
    () =>
      backendPois ??
      (isPoisError && (activeGroupId === null || isActiveMapError)
        ? landmarks
        : []),
    [activeGroupId, backendPois, isActiveMapError, isPoisError],
  )
  const exploredCountryCodes = useMemo(
    () => [
      ...new Set(sourceDiscoveries.map((discovery) => discovery.countryCode)),
    ],
    [sourceDiscoveries],
  )

  const visibleDiscoveries = useMemo(
    () =>
      activeCategory
        ? sourceDiscoveries.filter(
            (discovery) => discovery.category === activeCategory,
          )
        : sourceDiscoveries,
    [activeCategory, sourceDiscoveries],
  )

  const handleSelectDiscovery = useCallback(
    (id: number) =>
      navigate(discoveryPath(id, activeGroupId), {
        state: {
          returnTo: '/',
          backgroundLocation: locationRef.current,
        } satisfies DiscoveryRouteState,
      }),
    [navigate, activeGroupId],
  )
  const handleSelectLandmark = useCallback(
    (id: string) => navigate(`/landmarks/${id}`, { state: { from: 'map' } }),
    [navigate],
  )
  const handleSelectMap = useCallback(
    (groupId: string | null) => {
      setActiveMap.mutate(groupId, {
        onSuccess: () => setIsMapPickerOpen(false),
      })
    },
    [setActiveMap],
  )

  return (
    <main
      className={`fixed inset-0 overflow-hidden bg-[#e8e3d9] ${active ? 'visible' : 'invisible pointer-events-none'}`}
      inert={!active || undefined}
      aria-hidden={!active || undefined}
    >
      <h1 className="sr-only">Explore Paris</h1>
      <MapCanvas
        ref={mapRef}
        discoveries={visibleDiscoveries}
        landmarks={sourceLandmarks}
        exploredCountryCodes={exploredCountryCodes}
        photoAccessToken={session?.accessToken}
        onSelectDiscovery={handleSelectDiscovery}
        onSelectLandmark={handleSelectLandmark}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[#f7f5f0]/20"
        aria-hidden="true"
      />
      <div
        role="group"
        aria-label="Map controls"
        className="sterna-map-controls relative z-10 px-4 pt-4"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isMapPickerOpen}
            onClick={() => {
              setActiveMap.reset()
              setIsMapPickerOpen(true)
            }}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/75 bg-card/95 px-3 text-left text-sm font-semibold shadow-sm backdrop-blur"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {activeGroupId ? <UsersRound className="size-4" /> : userInitial}
            </span>
            <span className="truncate">{activeMapName(activeMap)}</span>
          </button>
          <Button
            asChild
            size="icon"
            variant="outline"
            className="size-11 bg-card/95"
          >
            <Link to="/search" aria-label="Search places">
              <Search className="size-5" />
            </Link>
          </Button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          <FilterChip
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          >
            All
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              active={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              <CategoryIcon category={category.id} className="size-4" />
              {category.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {isMapPickerOpen && (
        <MapSwitcherSheet
          activeGroupId={activeGroupId}
          groups={groups}
          isPending={setActiveMap.isPending}
          isError={setActiveMap.isError}
          onClose={() => setIsMapPickerOpen(false)}
          onSelect={handleSelectMap}
        />
      )}

      <div className="absolute bottom-28 right-4 z-20">
        <Button
          size="icon"
          variant="outline"
          className="size-11 rounded-full bg-card shadow-sm"
          aria-label="Locate me"
          onClick={() => mapRef.current?.locate()}
        >
          <LocateFixed className="size-5" />
        </Button>
      </div>
    </main>
  )
}

function FilterChip({
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
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card/95 text-foreground'}`}
    >
      {children}
    </button>
  )
}
