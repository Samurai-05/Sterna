import {
  ChevronDown,
  Compass,
  LocateFixed,
  MapPinned,
  Search,
  UserRound,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { MapCanvas, type MapCanvasHandle } from '@/components/MapCanvas'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { defaultGlobeViewport, type MapViewport } from '@/lib/map-viewport'
import { useActiveMap, useSetActiveMap } from '@/hooks/useActiveMap'
import type { DiscoveryRouteState } from '@/lib/route-state'
import { loadSession } from '@/lib/session'
import {
  getCurrentDevicePosition,
  isNativeAndroid,
  type DeviceLocationPosition,
} from '@/lib/device-location'

export function MapPage({ active }: { active: boolean }) {
  const [activeFilter, setActiveFilter] = useState<
    DiscoveryCategory | 'pois' | null
  >(null)
  const [initialViewport, setInitialViewport] = useState<MapViewport | null>(
    () =>
      isNativeAndroid() || navigator.geolocation ? null : defaultGlobeViewport,
  )
  const mapRef = useRef<MapCanvasHandle>(null)
  const initialLocationRequestRef =
    useRef<Promise<DeviceLocationPosition> | null>(null)
  const [deviceLocation, setDeviceLocation] = useState<[number, number] | null>(
    null,
  )
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
    const locationRequest =
      initialLocationRequestRef.current ?? getCurrentDevicePosition()
    initialLocationRequestRef.current = locationRequest

    void locationRequest.then(
      ({ coords }) => {
        if (!activeRequest) return
        const coordinates: [number, number] = [
          coords.longitude,
          coords.latitude,
        ]
        setDeviceLocation(coordinates)
        setInitialViewport({
          center: coordinates,
          zoom: 13,
        })
      },
      () => {
        if (activeRequest) setInitialViewport(defaultGlobeViewport)
      },
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
  const personalMapLabel = 'My map'
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
  const sourceDiscoveries = useMemo(
    () => backendDiscoveries ?? (session ? [] : discoveries),
    [backendDiscoveries, session],
  )
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
          // A discovery opened from the map is a single-photo context. Only
          // the Gallery supplies a multi-photo carousel.
          galleryIds: [id],
          gallerySource: activeGroupId ? 'group' : 'personal',
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
          userLocation={deviceLocation ?? undefined}
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
        className="pointer-events-none absolute inset-0 bg-[#f7f5f0]/10"
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

      <div className="absolute bottom-28 right-4 z-20 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          className="size-11 rounded-full bg-card shadow-sm"
          aria-label="Reset orientation to north"
          onClick={() => mapRef.current?.resetNorth()}
        >
          <Compass className="size-5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="size-11 rounded-full bg-card shadow-sm"
          aria-label="Locate me"
          onClick={() => {
            void getCurrentDevicePosition().then(
              ({ coords }) => {
                const coordinates: [number, number] = [
                  coords.longitude,
                  coords.latitude,
                ]
                setDeviceLocation(coordinates)
                mapRef.current?.locate(coordinates)
              },
              () => setDeviceLocation(null),
            )
          }}
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
  groups,
  isPending,
  isError,
  onSelect,
}: {
  activeGroupId: string | null
  activeMapName: string
  groups: GroupSummary[] | undefined
  isPending: boolean
  isError: boolean
  onSelect: (groupId: string | null, onSuccess: () => void) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const alternativeMaps = [
    ...(activeGroupId === null
      ? []
      : [{ id: 'personal', groupId: null, name: 'My map', personal: true }]),
    ...(groups ?? [])
      .filter((group) => group.id !== activeGroupId)
      .map((group) => ({
        id: group.id,
        groupId: group.id,
        name: group.name,
        personal: false,
      })),
  ]

  return (
    <div className="min-w-0 flex-1">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Active map: ${activeMapName}. Choose a different map`}
            className="flex h-12 w-full items-center gap-2 rounded-xl border border-white/80 bg-card/95 px-3 text-left shadow-md backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <MapChoiceIcon personal={activeGroupId === null} active compact>
              {activeGroupId ? (
                <UsersRound className="size-4" />
              ) : (
                <UserRound className="size-4" />
              )}
            </MapChoiceIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-muted-foreground">
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
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={8}
          aria-label="Choose active map"
          className="max-h-[min(24rem,calc(100dvh-8rem))] rounded-2xl border border-border/80 bg-card/95 p-1 text-foreground shadow-xl backdrop-blur-md"
        >
          {alternativeMaps.map((map) => (
            <DropdownMenuItem
              key={map.id}
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault()
                onSelect(map.groupId, () => setIsOpen(false))
              }}
              className="min-h-11 w-full gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold focus:bg-accent focus:text-foreground"
            >
              <MapChoiceIcon personal={map.personal} active={false}>
                {map.personal ? (
                  <UserRound className="size-4" />
                ) : (
                  <UsersRound className="size-4" />
                )}
              </MapChoiceIcon>
              <span className="min-w-0 flex-1 truncate">{map.name}</span>
            </DropdownMenuItem>
          ))}

          {alternativeMaps.length > 0 && <DropdownMenuSeparator />}

          <DropdownMenuItem
            asChild
            className="min-h-11 w-full gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-primary focus:bg-accent focus:text-primary"
          >
            <Link to="/groups">
              <UserRoundPlus className="size-4" />
              <span className="min-w-0 flex-1 truncate">
                Create or join a group
              </span>
            </Link>
          </DropdownMenuItem>

          {isError && (
            <p
              role="status"
              aria-live="polite"
              className="px-3 py-2 text-sm font-medium text-destructive"
            >
              Unable to change the active map.
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
      className={`flex shrink-0 items-center justify-center ${compact ? 'size-7 rounded-lg' : 'size-10 rounded-xl'} ${personal || active ? 'bg-accent text-primary' : 'bg-terra-50 text-terra-600'}`}
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
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 ${
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
