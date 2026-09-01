import { Link, useLocation } from 'react-router'

import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { discoveryPath } from '@/lib/discovery-path'
import { discoveryLocationLabel } from '@/lib/location-label'
import type { Discovery } from '@/lib/mock-data'

export function ProfileDiscoveryCard({ discovery }: { discovery: Discovery }) {
  const location = useLocation()
  const dateLabel = formatDiscoveryDate(discovery.discoveredAt)
  const locationLabel = getUsefulLocation(discovery)

  return (
    <Link
      to={discoveryPath(discovery.id)}
      aria-label={[discovery.name, locationLabel].filter(Boolean).join(', ')}
      state={{ returnTo: `${location.pathname}${location.search}` }}
      className="group w-[44vw] min-w-40 max-w-52 shrink-0 snap-start overflow-hidden rounded-2xl bg-card transition-transform active:scale-[0.99]"
    >
      <DiscoveryPhoto
        discovery={discovery}
        alt=""
        variant="card"
        width={520}
        className="aspect-[4/5] w-full object-cover"
      />
      <span className="block space-y-1.5 px-1 py-3">
        <strong className="block truncate text-base font-semibold leading-5 text-foreground">
          {discovery.name}
        </strong>
        {locationLabel && (
          <span className="block truncate text-sm leading-5 text-muted-foreground">
            {locationLabel}
          </span>
        )}
        {dateLabel && (
          <time
            dateTime={discovery.discoveredAt}
            className="block text-xs leading-4 text-muted-foreground"
          >
            {dateLabel}
          </time>
        )}
      </span>
    </Link>
  )
}

function getUsefulLocation(discovery: Discovery): string | null {
  const label = discoveryLocationLabel(discovery)
  return label === 'Unknown country' ? null : label
}

function formatDiscoveryDate(value?: string): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
