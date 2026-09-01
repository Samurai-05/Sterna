import { MapPin } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { discoveryPath } from '@/lib/discovery-path'
import { categoryLabel, type Discovery } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export function DiscoveryCard({
  discovery,
  groupId,
  className,
  locationLabel,
}: {
  discovery: Discovery
  /** Set when the card sits on a group's shared map. */
  groupId?: string
  className?: string
  /** Overrides the raw stored location when a friendlier label is available. */
  locationLabel?: string
}) {
  const location = useLocation()

  return (
    <Link
      to={discoveryPath(discovery.id, groupId)}
      state={{ returnTo: `${location.pathname}${location.search}` }}
      className={cn(
        'group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform active:scale-[0.99]',
        className,
      )}
    >
      <DiscoveryPhoto
        discovery={discovery}
        alt=""
        width={560}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold leading-5 text-foreground">
            {discovery.name}
          </h2>
          <CategoryIcon
            category={discovery.category}
            className="size-4 shrink-0"
          />
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          <span className="truncate">
            {locationLabel ?? discovery.location}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {categoryLabel(discovery.category)} · {discovery.author} ·{' '}
          {discovery.relativeDate}
        </p>
      </div>
    </Link>
  )
}
