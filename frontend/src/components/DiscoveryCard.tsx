import { MapPin } from 'lucide-react'
import { Link } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { categoryLabel, imageUrl, type Discovery } from '@/lib/mock-data'

export function DiscoveryCard({ discovery }: { discovery: Discovery }) {
  return (
    <Link
      to={`/discoveries/${discovery.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform active:scale-[0.99]"
    >
      <img
        src={imageUrl(discovery.imageId, 560)}
        alt=""
        className="aspect-[4/3] w-full object-cover"
        loading="lazy"
      />
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold leading-5 text-foreground">
            {discovery.name}
          </h2>
          <CategoryIcon
            category={discovery.category}
            className="size-4 shrink-0 text-primary"
          />
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          <span className="truncate">{discovery.location}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {categoryLabel(discovery.category)} · {discovery.author} ·{' '}
          {discovery.relativeDate}
        </p>
      </div>
    </Link>
  )
}
