import { CalendarDays, MapPin, MoreHorizontal } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { categoryLabel, discoveries, imageUrl } from '@/lib/mock-data'

export function DiscoveryDetailPage() {
  const { discoveryId } = useParams()
  const discovery =
    discoveries.find((item) => item.id === Number(discoveryId)) ??
    discoveries[0]
  return (
    <main className="min-h-dvh bg-background pb-8">
      <PageHeader
        title="Discovery"
        backTo="/collection"
        action={
          <Button
            size="icon"
            variant="ghost"
            className="size-11"
            aria-label="More options"
          >
            <MoreHorizontal />
          </Button>
        }
      />
      <article className="px-5">
        <img
          src={imageUrl(discovery.imageId)}
          alt={discovery.name}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
        <div className="mt-5 flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <CategoryIcon category={discovery.category} className="size-4" />
              {categoryLabel(discovery.category)}
            </p>
            <h1 className="font-display text-[30px] font-semibold leading-9">
              {discovery.name}
            </h1>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbf1ec] text-[#b8572b]">
            {discovery.initials}
          </span>
        </div>
        <div className="mt-5 space-y-3 text-sm text-muted-foreground">
          <p className="flex gap-2">
            <MapPin className="size-4 shrink-0 text-primary" />
            {discovery.location}
          </p>
          <p className="flex gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            Added by {discovery.author} · {discovery.relativeDate}
          </p>
        </div>
        <p className="mt-6 text-[16px] leading-6 text-foreground">
          {discovery.description}
        </p>
        <Button asChild variant="outline" className="mt-6 h-11 w-full">
          <Link to={`/discoveries/${discovery.id}/edit`}>Edit discovery</Link>
        </Button>
      </article>
    </main>
  )
}
