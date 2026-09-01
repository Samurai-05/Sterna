import { CalendarDays, MapPin, UsersRound } from 'lucide-react'

import { CategoryIcon } from '@/components/CategoryIcon'
import { categoryLabel, type Discovery } from '@/lib/mock-data'

export function DiscoveryDetailsContent({
  discovery,
  groupId,
  isAuthor,
}: {
  discovery: Discovery
  groupId?: string | null
  isAuthor: boolean
}) {
  return (
    <div className="border-t border-border/70 pt-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <CategoryIcon category={discovery.category} className="size-4" />
        {categoryLabel(discovery.category)}
      </div>
      <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{discovery.location}</span>
        </p>
        <p className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Added by {discovery.author} · {discovery.relativeDate}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <UsersRound className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{groupId ? 'Shared group map' : 'Personal map'}</span>
        </p>
      </div>
      <p className="mt-6 text-base leading-6 text-foreground">
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
