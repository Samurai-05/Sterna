import { MapPin, MapPinned } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { poiAppearance } from '@/lib/category-appearance'
import { getPoiImageUrl } from '@/lib/poi-image'
import { landmarkLocationLabel } from '@/lib/location-label'
import { type Landmark } from '@/lib/mock-data'

export function PoiCard({ poi }: { poi: Landmark }) {
  const location = useLocation()
  const poiLocation = landmarkLocationLabel(poi)

  return (
    <Link
      to={`/landmarks/${poi.id}`}
      state={{ returnTo: location.pathname }}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform active:scale-[0.99]"
    >
      <div className="relative">
        <img
          src={getPoiImageUrl(poi.imageUrl, poi.imageId, 'card')}
          alt={poi.name}
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium leading-none text-foreground shadow-sm backdrop-blur-sm">
          <MapPinned className={`size-3.5 ${poiAppearance.icon}`} />
          POI
        </span>
      </div>
      <div className="space-y-2 p-3">
        <h2 className="line-clamp-2 font-semibold leading-5 text-foreground">
          {poi.name}
        </h2>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{poiLocation}</span>
        </p>
      </div>
    </Link>
  )
}
