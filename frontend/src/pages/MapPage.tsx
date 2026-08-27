import { LocateFixed, Search, UsersRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { MapCanvas, type MapCanvasHandle } from '@/components/MapCanvas'
import { Button } from '@/components/ui/button'
import {
  categories,
  discoveries,
  landmarks,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import { getDiscoveries, getGroupDiscoveries } from '@/lib/api'
import { useActiveMap } from '@/hooks/useActiveMap'
import { loadSession } from '@/lib/session'

export function MapPage() {
  const [activeCategory, setActiveCategory] =
    useState<DiscoveryCategory | null>(null)
  const mapRef = useRef<MapCanvasHandle>(null)
  const navigate = useNavigate()
  const session = loadSession()
  const userInitial =
    session?.user.userName.trim().charAt(0).toUpperCase() || '?'
  const { data: activeMap } = useActiveMap()
  const activeGroupId = activeMap?.groupId ?? null
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
  const sourceDiscoveries = backendDiscoveries ?? discoveries
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
      navigate(`/discoveries/${id}`, { state: { returnTo: '/' } }),
    [navigate],
  )
  const handleSelectLandmark = useCallback(
    (id: string) => navigate(`/landmarks/${id}`, { state: { from: 'map' } }),
    [navigate],
  )

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#e8e3d9]">
      <h1 className="sr-only">Explore Paris</h1>
      <MapCanvas
        ref={mapRef}
        discoveries={visibleDiscoveries}
        landmarks={landmarks}
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
          <Link
            to="/groups"
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/75 bg-card/95 px-3 text-sm font-semibold shadow-sm backdrop-blur"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {activeGroupId ? <UsersRound className="size-4" /> : userInitial}
            </span>
            <span className="truncate">
              {activeMap?.name ?? 'Personal map'}
            </span>
          </Link>
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
