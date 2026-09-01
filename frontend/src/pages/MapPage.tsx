import {
  Check,
  ChevronDown,
  LocateFixed,
  MapPinned,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { MapCanvas, type MapCanvasHandle } from '@/components/MapCanvas'
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
  type GroupSummary,
} from '@/lib/api'
import { discoveryPath } from '@/lib/discovery-path'
import {
  categoryAppearance,
  poiAppearance,
  type CategoryAppearance,
} from '@/lib/category-appearance'
import { getMapTarget } from '@/lib/map-target'
import {
  defaultMapViewport,
  getStoredMapViewport,
  type MapViewport,
} from '@/lib/map-viewport'
import { useActiveMap, useSetActiveMap } from '@/hooks/useActiveMap'
import type { DiscoveryRouteState } from '@/lib/route-state'
import { loadSession } from '@/lib/session'
import { personalMapName } from '@/lib/personal-map-name'

export function MapPage({ active }: { active: boolean }) {
  const [activeFilter, setActiveFilter] = useState<
    DiscoveryCategory | 'pois' | null
  >(null)
  const [initialViewport, setInitialViewport] = useState<MapViewport | null>(
    () =>
      getStoredMapViewport() ??
      (navigator.geolocation ? null : defaultMapViewport),
  )
  const mapRef = useRef<MapCanvasHandle>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const mapTarget = getMapTarget(location.state)
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])
  useEffect(() => {
    if (initialViewport) return

    let activeRequest = true
    const geolocation = navigator.geolocation
    if (!geolocation) return

    geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!activeRequest) return
        setInitialViewport({
          center: [coords.longitude, coords.latitude],
          zoom: 13,
        })
      },
      () => {
        if (activeRequest) setInitialViewport(defaultMapViewport)
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8000 },
    )

    return () => {
      activeRequest = false
    }
  }, [initialViewport])
  useEffect(() => {
    if (active) {
      mapRef.current?.resize()
    }
  }, [active])
  useEffect(() => {
    if (!active || !mapTarget || !initialViewport) return

    mapRef.current?.flyTo(mapTarget.coordinates, mapTarget.zoom)
    // Consume the target so returning to the map later does not replay it.
    navigate('/', { replace: true, state: null })
  }, [active, initialViewport, location.key, mapTarget, navigate])
  const session = loadSession()
  const personalMapLabel = personalMapName(session?.user.userName)
  const { data: activeMap } = useActiveMap()
  const setActiveMap = useSetActiveMap()
  const activeGroupId = activeMap?.groupId ?? null
  const { data: groups } = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session),
  })
  // The map renders whichever destination is active: the personal map, or the
  // group's shared map with every member's discoveries.
  const { data: backendDiscoveries } = useQuery({
    queryKey: activeGroupId
      ? ['group-discoveries', session?.user.id, activeGroupId]
      : ['discoveries', session?.user.id],
    queryFn: () =>
      activeGroupId
        ? getGroupDiscoveries(session!.accessToken, activeGroupId)
        : getDiscoveries(session!.accessToken),
    enabled: Boolean(session),
  })
  const { data: backendPois } = useQuery({
    queryKey: ['pois', session?.user.id],
    queryFn: () => getPois(session!.accessToken),
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  })
  // Sample discoveries are only for the signed-out demo. Showing them while
  // an authenticated query loads or fails makes them look like real personal
  // discoveries and can visually leak data between map contexts.
  const sourceDiscoveries = backendDiscoveries ?? (session ? [] : discoveries)
  const sourceLandmarks = backendPois ?? (session ? [] : landmarks)
  const exploredCountryCodes = useMemo(
    () => [
      ...new Set(sourceDiscoveries.map((discovery) => discovery.countryCode)),
    ],
    [sourceDiscoveries],
  )

  const visibleDiscoveries = useMemo(() => {
    if (activeFilter === 'pois') return []
    if (!activeFilter) return sourceDiscoveries

    return sourceDiscoveries.filter(
      (discovery) => discovery.category === activeFilter,
    )
  }, [activeFilter, sourceDiscoveries])
  const visibleLandmarks =
    activeFilter && activeFilter !== 'pois' ? [] : sourceLandmarks

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

  return (
    <main
      className={`fixed inset-0 overflow-hidden bg-[#e8e3d9] ${active ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'}`}
      inert={!active || undefined}
      aria-hidden={!active || undefined}
    >
      <h1 className="sr-only">Explore map</h1>
      {initialViewport ? (
        <MapCanvas
          ref={mapRef}
          initialViewport={initialViewport}
          discoveries={visibleDiscoveries}
          landmarks={visibleLandmarks}
          exploredCountryCodes={exploredCountryCodes}
          photoAccessToken={session?.accessToken}
          onSelectDiscovery={handleSelectDiscovery}
          onSelectLandmark={handleSelectLandmark}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Finding your location…
        </div>
      )}
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
          <ActiveMapSelector
            activeGroupId={activeGroupId}
            activeMapName={activeMap?.name ?? personalMapLabel}
            personalMapName={personalMapLabel}
            groups={groups}
            isPending={setActiveMap.isPending}
            isError={setActiveMap.isError}
            onSelect={(groupId, onSuccess) =>
              setActiveMap.mutate(groupId, { onSuccess })
            }
          />
          <Button
            asChild
            size="icon"
            variant="outline"
            className="size-12 bg-card/95"
          >
            <Link to="/search" aria-label="Search places">
              <Search className="size-5" />
            </Link>
          </Button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip
            active={activeFilter === null}
            onClick={() => setActiveFilter(null)}
          >
            All
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              active={activeFilter === category.id}
              onClick={() => setActiveFilter(category.id)}
              appearance={categoryAppearance[category.id]}
            >
              <CategoryIcon category={category.id} className="size-4" />
              {category.label}
            </FilterChip>
          ))}
          <FilterChip
            active={activeFilter === 'pois'}
            onClick={() => setActiveFilter('pois')}
            appearance={poiAppearance}
          >
            <MapPinned className={`size-4 ${poiAppearance.icon}`} />
            POIs
          </FilterChip>
        </div>
      </div>

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

function ActiveMapSelector({
  activeGroupId,
  activeMapName,
  personalMapName,
  groups,
  isPending,
  isError,
  onSelect,
}: {
  activeGroupId: string | null
  activeMapName: string
  personalMapName: string
  groups: GroupSummary[] | undefined
  isPending: boolean
  isError: boolean
  onSelect: (groupId: string | null, onSuccess: () => void) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  function select(groupId: string | null) {
    if (groupId === activeGroupId) {
      setIsOpen(false)
      return
    }

    onSelect(groupId, () => setIsOpen(false))
  }

  return (
    <div ref={selectorRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="active-map-menu"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-12 w-full items-center gap-2 rounded-xl border border-white/80 bg-card/95 px-3 text-left shadow-md backdrop-blur transition-colors hover:bg-card"
      >
        <MapChoiceIcon personal={!activeGroupId} active compact>
          {activeGroupId ? (
            <UsersRound className="size-4" />
          ) : (
            <UserRound className="size-4" />
          )}
        </MapChoiceIcon>
        <span className="min-w-0 flex-1">
          <span className="block text-[8px] font-bold uppercase leading-none tracking-[0.12em] text-muted-foreground">
            Active map
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold leading-4 text-foreground">
            {activeMapName}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          id="active-map-menu"
          role="menu"
          aria-label="Choose active map"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 max-h-[min(24rem,calc(100dvh-8rem))] overflow-y-auto rounded-2xl border border-border/80 bg-card/95 shadow-xl backdrop-blur"
        >
          <MapMenuItem
            active={activeGroupId === null}
            disabled={isPending}
            icon={<UserRound className="size-5" />}
            name={personalMapName}
            personal
            onClick={() => select(null)}
          />
          {groups?.map((group) => (
            <MapMenuItem
              key={group.id}
              active={activeGroupId === group.id}
              disabled={isPending}
              icon={<UsersRound className="size-5" />}
              name={group.name}
              onClick={() => select(group.id)}
            />
          ))}
          {isError && (
            <p
              role="status"
              className="border-t px-4 py-3 text-sm text-destructive"
            >
              Unable to change the active map.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function MapMenuItem({
  active,
  disabled,
  icon,
  name,
  personal = false,
  onClick,
}: {
  active: boolean
  disabled: boolean
  icon: React.ReactNode
  name: string
  personal?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3 border-b border-border/70 px-4 text-left transition-colors last:border-b-0 disabled:opacity-60 ${active ? 'bg-green-50' : 'bg-card hover:bg-muted/70'}`}
    >
      <MapChoiceIcon personal={personal} active={active}>
        {icon}
      </MapChoiceIcon>
      <span className="min-w-0 flex-1 truncate text-base font-semibold">
        {name}
      </span>
      {active && <Check className="size-5 shrink-0 text-primary" />}
    </button>
  )
}

function MapChoiceIcon({
  personal,
  active,
  compact = false,
  children,
}: {
  personal: boolean
  active: boolean
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${compact ? 'size-7 rounded-lg' : 'size-10 rounded-xl'} ${personal ? 'bg-violet-100 text-violet-800' : active ? 'bg-emerald-100 text-primary' : 'bg-[#fbf1ec] text-[#b8572b]'}`}
    >
      {children}
    </span>
  )
}

function FilterChip({
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
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium text-foreground transition-colors ${
        appearance
          ? active
            ? `${appearance.background} border-transparent ring-2 ${appearance.ring}`
            : 'border-border bg-card/95'
          : active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card/95'
      }`}
    >
      {children}
    </button>
  )
}
