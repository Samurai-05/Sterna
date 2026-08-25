import { LocateFixed, Search, SlidersHorizontal, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { MapCanvas } from '@/components/MapCanvas'
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
  const visibleDiscoveries = activeCategory
    ? discoveries.filter((discovery) => discovery.category === activeCategory)
    : discoveries

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#e8e3d9] pb-24">
      <h1 className="sr-only">Explore Paris</h1>
      <MapCanvas />
      <div className="absolute inset-0 bg-[#f7f5f0]/20" aria-hidden="true" />
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

      <div className="relative z-10 mx-5 mt-12 h-[58dvh] min-h-96">
        <div className="absolute inset-0 rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,.34),rgba(221,231,216,.5))] shadow-[inset_0_0_0_1px_rgba(45,90,61,.08)]" />
        <span className="absolute left-[6%] top-[12%] text-xs font-medium text-[#78716c]">
          Montmartre
        </span>
        <span className="absolute right-[12%] top-[28%] text-xs font-medium text-[#78716c]">
          Le Marais
        </span>
        <span className="absolute left-[27%] top-[56%] text-xs font-medium text-[#78716c]">
          Louvre
        </span>
        <span className="absolute right-[18%] bottom-[18%] text-xs font-medium text-[#78716c]">
          Luxembourg
        </span>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 400 600"
          aria-hidden="true"
        >
          <path
            d="M0 145C85 105 105 195 180 158s110-92 220-35M8 390c100-50 164 52 258-4s85-85 134-55M95 0c-32 132 42 170 9 292s41 157 12 308"
            fill="none"
            stroke="#fff"
            strokeWidth="14"
            opacity=".82"
          />
          <path
            d="M0 145C85 105 105 195 180 158s110-92 220-35M8 390c100-50 164 52 258-4s85-85 134-55M95 0c-32 132 42 170 9 292s41 157 12 308"
            fill="none"
            stroke="#d4cec4"
            strokeWidth="1"
            opacity=".85"
          />
          <path
            d="M15 260c105-22 180 38 365 4M150 0c8 78-35 119 12 185s4 102 39 155"
            fill="none"
            stroke="#f7f5f0"
            strokeWidth="5"
          />
        </svg>
        {visibleDiscoveries.map((discovery) => (
          <Link
            key={discovery.id}
            to={`/discoveries/${discovery.id}`}
            aria-label={`View ${discovery.name}`}
            className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
            style={discovery.mapPosition}
          >
            <CategoryIcon category={discovery.category} className="size-5" />
          </Link>
        ))}
        {landmarks.map((landmark, index) => (
          <Link
            key={landmark.id}
            to={`/landmarks/${landmark.id}`}
            aria-label={`View ${landmark.name}`}
            className="absolute flex size-10 items-center justify-center rounded-full border-2 border-white bg-[#c4622d] text-white shadow-lg"
            style={
              index === 0
                ? { right: '18%', top: '17%' }
                : { left: '24%', top: '28%' }
            }
          >
            <Trophy className="size-4" />
          </Link>
        ))}
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
