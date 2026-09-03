import { useEffect, useState } from 'react'

import { CategoryIcon } from '@/components/CategoryIcon'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerSwipeHandle,
  DrawerTitle,
} from '@/components/ui/drawer'
import { getPhoto } from '@/lib/api'
import { getDiscoveryMapColor } from '@/lib/discovery-map-markers'
import type { DiscoveryMarkerData } from '@/components/MapCanvas'

interface DiscoveryClusterSheetProps {
  open: boolean
  discoveries: DiscoveryMarkerData[]
  photoAccessToken?: string
  onOpenChange: (open: boolean) => void
  onSelectDiscovery: (id: number) => void
}

function ClusterSheetPhoto({
  discovery,
  photoAccessToken,
}: {
  discovery: DiscoveryMarkerData
  photoAccessToken?: string
}) {
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let objectUrl: string | undefined

    if (!photoAccessToken || !discovery.imageObjectKey) return

    void getPhoto(photoAccessToken, discovery.imageObjectKey, 'card')
      .then(async (blob) => {
        objectUrl = URL.createObjectURL(blob)
        const image = new Image()
        image.src = objectUrl
        await image.decode?.()

        if (!active) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = undefined
          return
        }

        setSource(objectUrl)
      })
      .catch(() => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = undefined
        }
        if (active) setSource(null)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [discovery.imageObjectKey, photoAccessToken])

  if (source) {
    return (
      <img
        src={source}
        alt=""
        className="aspect-square w-full rounded-xl object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="flex aspect-square w-full items-center justify-center rounded-xl"
      style={{ backgroundColor: getDiscoveryMapColor(discovery.category) }}
    >
      <CategoryIcon
        category={discovery.category}
        className="size-8 text-white"
      />
    </span>
  )
}

export function DiscoveryClusterSheet({
  open,
  discoveries,
  photoAccessToken,
  onOpenChange,
  onSelectDiscovery,
}: DiscoveryClusterSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <DrawerContent
        contentDriven
        className="border border-border/80 bg-card text-foreground shadow-[0_-12px_40px_rgba(0,0,0,0.18)] motion-reduce:transition-none"
      >
        <DrawerSwipeHandle />
        <DrawerHeader className="px-4 pb-3 text-left">
          <DrawerTitle>{discoveries.length} discoveries nearby</DrawerTitle>
        </DrawerHeader>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-[max(1.5rem,var(--sterna-safe-area-bottom))]">
          {discoveries.map((discovery) => (
            <button
              key={discovery.id}
              type="button"
              aria-label={`View ${discovery.name}`}
              className="w-28 shrink-0 snap-start rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              onClick={() => {
                onOpenChange(false)
                onSelectDiscovery(discovery.id)
              }}
            >
              <ClusterSheetPhoto
                discovery={discovery}
                photoAccessToken={photoAccessToken}
              />
              <span className="mt-2 block truncate text-sm font-semibold">
                {discovery.name}
              </span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
