import { useId, useState } from 'react'

import { getPoiImageUrl } from '@/lib/poi-image'
import { type Landmark } from '@/lib/mock-data'

export function VisitedPoiThumbnail({ poi }: { poi: Landmark }) {
  const [isNameVisible, setIsNameVisible] = useState(false)
  const tooltipId = useId()

  return (
    <button
      type="button"
      aria-label={poi.name}
      aria-describedby={tooltipId}
      aria-expanded={isNameVisible}
      onClick={() => setIsNameVisible((visible) => !visible)}
      onBlur={() => setIsNameVisible(false)}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        setIsNameVisible(false)
        event.currentTarget.blur()
      }}
      className="group relative size-14 overflow-visible rounded-xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/40 active:translate-y-0"
    >
      <img
        src={getPoiImageUrl(poi.imageUrl, poi.imageId, 'thumbnail')}
        alt=""
        width="56"
        height="56"
        loading="lazy"
        decoding="async"
        className="size-14 rounded-xl border border-border object-cover shadow-sm"
      />
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 max-w-56 -translate-x-1/2 truncate rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${isNameVisible ? 'opacity-100' : ''}`}
      >
        {poi.name}
      </span>
    </button>
  )
}
