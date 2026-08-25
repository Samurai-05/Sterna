import { LocateFixed, Search, SlidersHorizontal } from 'lucide-react'
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

export function MapPage() {
  const [activeCategory, setActiveCategory] =
    useState<DiscoveryCategory | null>(null)
  const mapRef = useRef<MapCanvasHandle>(null)
  const navigate = useNavigate()

  const visibleDiscoveries = useMemo(
    () =>
      activeCategory
        ? discoveries.filter((discovery) => discovery.category === activeCategory)
        : discoveries,
    [activeCategory],
  )

  const handleSelectDiscovery = useCallback(
    (id: number) => navigate(`/discoveries/${id}`),
    [navigate],
  )
  const handleSelectLandmark = useCallback(
    (id: string) => navigate(`/landmarks/${id}`),
    [navigate],
  )

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#e8e3d9] pb-24">
      <h1 className="sr-only">Explore Paris</h1>
      <MapCanvas
        ref={mapRef}
        discoveries={visibleDiscoveries}
        landmarks={landmarks}
        onSelectDiscovery={handleSelectDiscovery}
        onSelectLandmark={handleSelectLandmark}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[#f7f5f0]/20"
        aria-hidden="true"
      />
      <div className="relative z-10 px-4 pt-4">
        <div className="flex items-center gap-2">
          <Link
            to="/groups"
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/75 bg-card/95 px-3 text-sm font-semibold shadow-sm backdrop-blur"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              E
            </span>
            <span className="truncate">Personal map</span>
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

      <div className="absolute bottom-28 right-4 z-20 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          className="size-11 rounded-full bg-card shadow-sm"
          aria-label="Filter discoveries"
        >
          <SlidersHorizontal className="size-5" />
        </Button>
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
