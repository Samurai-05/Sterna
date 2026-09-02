import { MapPin } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { discoveryPath } from '@/lib/discovery-path'
import { categoryLabel, type Discovery } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { DiscoveryRouteState } from '@/lib/route-state'

export function DiscoveryCard({
  discovery,
  groupId,
  className,
  locationLabel,
  galleryIds,
  gallerySource,
  layout = 'card',
}: {
  discovery: Discovery
  /** Set when the card sits on a group's shared map. */
  groupId?: string
  className?: string
  /** Overrides the raw stored location when a friendlier label is available. */
  locationLabel?: string
  galleryIds?: number[]
  gallerySource?: DiscoveryRouteState['gallerySource']
  layout?: 'card' | 'list'
}) {
  const location = useLocation()
  const isList = layout === 'list'

  return (
    <Link
      to={discoveryPath(discovery.id, groupId)}
      state={{
        returnTo: `${location.pathname}${location.search}`,
        galleryIds,
        gallerySource,
      }}
      className={cn(
        'group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform active:scale-[0.99]',
        className,
      )}
    >
      <div className="relative">
        <DiscoveryPhoto
          discovery={discovery}
          alt=""
          variant="card"
          width={560}
          className="aspect-[4/3] w-full object-cover"
        />
        {isList && (
          <span className="absolute right-2 top-2 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium leading-none text-foreground shadow-sm backdrop-blur-sm">
            <CategoryIcon category={discovery.category} className="size-3.5" />
            <span className="truncate">
              {categoryLabel(discovery.category)}
            </span>
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 font-semibold leading-5 text-foreground">
            {discovery.name}
          </h2>
          {!isList && (
            <CategoryIcon
              category={discovery.category}
              className="size-4 shrink-0"
            />
          )}
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">
            {locationLabel ?? discovery.location}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {!isList && <>{categoryLabel(discovery.category)} · </>}
          {discovery.author} · {discovery.relativeDate}
        </p>
      </div>
    </Link>
  )
}
