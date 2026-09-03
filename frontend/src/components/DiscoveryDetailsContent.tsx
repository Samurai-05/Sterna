import {
  CalendarDays,
  MapPin,
  MapPinned,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { CategoryIcon } from '@/components/CategoryIcon'
import { Button } from '@/components/ui/button'
import { categoryAppearance } from '@/lib/category-appearance'
import { discoveryLocationLabel } from '@/lib/location-label'
import { categoryLabel, type Discovery } from '@/lib/mock-data'

export function DiscoveryDetailsContent({
  discovery,
  groupId,
  isAuthor,
  onShowOnMap,
  isShowingOnMap = false,
}: {
  discovery: Discovery
  groupId?: string | null
  isAuthor: boolean
  onShowOnMap: () => void
  isShowingOnMap?: boolean
}) {
  return (
    <div className="border-t border-border/70 pt-4">
      <div role="group" aria-label="Discovery metadata">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-foreground ${categoryAppearance[discovery.category].background}`}
          style={{
            borderColor: categoryAppearance[discovery.category].color,
          }}
        >
          <CategoryIcon category={discovery.category} className="size-3.5" />
          {categoryLabel(discovery.category)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetadataItem
            icon={<MapPin className="size-4" />}
            label="Location"
            value={discoveryLocationLabel(discovery)}
            className="col-span-2"
          />
          <MetadataItem
            icon={<UserRound className="size-4" />}
            label="Added by"
            value={discovery.author}
          />
          <MetadataItem
            icon={<CalendarDays className="size-4" />}
            label="Date"
            value={discovery.relativeDate}
          />
          <MetadataItem
            icon={<UsersRound className="size-4" />}
            label="Map"
            value={groupId ? 'Shared group map' : 'Personal map'}
            className="col-span-2"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-11 w-full gap-2 rounded-xl"
        disabled={isShowingOnMap}
        onClick={onShowOnMap}
      >
        <MapPinned className="size-4 text-primary" aria-hidden="true" />
        {isShowingOnMap ? 'Opening map…' : 'Show on map'}
      </Button>
      <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Description
      </h2>
      <p className="mt-2 text-base leading-6 text-foreground">
        {discovery.description || 'No description added.'}
      </p>
      {!isAuthor && (
        <p className="mt-6 text-sm text-muted-foreground">
          Only {discovery.author} can edit or delete this discovery.
        </p>
      )}
    </div>
  )
}

function MetadataItem({
  icon,
  label,
  value,
  className = '',
}: {
  icon: ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`flex min-w-0 gap-2.5 rounded-xl bg-muted/60 p-3 ${className}`}
    >
      <span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium leading-5 text-foreground">
          {value}
        </p>
      </div>
    </div>
  )
}
