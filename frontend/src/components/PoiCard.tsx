import { MapPin, MapPinned } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { poiAppearance } from '@/lib/category-appearance'
import { getPoiImageUrl } from '@/lib/poi-image'
import { type Landmark } from '@/lib/mock-data'

export function PoiCard({ poi }: { poi: Landmark }) {
  const location = useLocation()
  const poiLocation =
    poi.city && poi.country
      ? `${poi.city}, ${poi.country}`
      : `${poi.coordinates[1].toFixed(5)}, ${poi.coordinates[0].toFixed(5)}`

  return (
    <Link
      to={`/landmarks/${poi.id}`}
      state={{ returnTo: location.pathname }}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform active:scale-[0.99]"
    >
      <img
        src={getPoiImageUrl(poi.imageUrl, poi.imageId, 'card')}
        alt={poi.name}
        className="aspect-[4/3] w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold leading-5 text-foreground">
            {poi.name}
          </h2>
          <MapPinned className={`size-4 shrink-0 ${poiAppearance.icon}`} />
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{poiLocation}</span>
        </p>
        <p className="text-xs text-muted-foreground">Point of interest</p>
      </div>
    </Link>
  )
}
