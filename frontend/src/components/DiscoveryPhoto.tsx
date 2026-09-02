import { ImageOff } from 'lucide-react'
import type { Ref, ReactEventHandler } from 'react'

import { type PhotoVariant } from '@/lib/api'
import { type Discovery } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { useDiscoveryPhotoSource } from '@/hooks/useDiscoveryPhotoSource'

export function DiscoveryPhoto({
  discovery,
  alt,
  className,
  width = 800,
  variant = 'card',
  onClick,
  onSourceChange,
}: {
  discovery: Discovery
  alt: string
  className?: string
  width?: number
  variant?: PhotoVariant
  onClick?: () => void
  onSourceChange?: (source: string | null) => void
}) {
  const { source, status, placeholderRef, onSourceError } =
    useDiscoveryPhotoSource({
      discovery,
      width,
      variant,
      onSourceChange,
    })

  if (status !== 'success' || !source) {
    return (
      <DiscoveryPhotoPlaceholder
        ref={placeholderRef}
        className={className}
        unavailable={status === 'error'}
      />
    )
  }

  return (
    <PhotoElement
      source={source}
      alt={alt}
      className={className}
      onError={onSourceError}
      onClick={onClick}
    />
  )
}

export function DiscoveryPhotoPlaceholder({
  ref,
  className,
  unavailable = false,
}: {
  ref?: Ref<HTMLDivElement>
  className?: string
  unavailable?: boolean
}) {
  return (
    <div
      ref={ref}
      role={unavailable ? 'img' : 'status'}
      aria-label={unavailable ? 'Photo unavailable' : 'Loading discovery photo'}
      aria-busy={!unavailable}
      className={cn(
        'flex items-center justify-center overflow-hidden bg-muted',
        className,
      )}
    >
      {unavailable ? (
        <ImageOff className="size-6 text-muted-foreground" aria-hidden="true" />
      ) : (
        <div
          aria-hidden="true"
          className="size-full animate-pulse bg-muted-foreground/10"
        />
      )}
    </div>
  )
}

function PhotoElement({
  ref,
  source,
  alt,
  className,
  onError,
  onClick,
}: {
  ref?: Ref<HTMLImageElement>
  source: string
  alt: string
  className?: string
  onError?: ReactEventHandler<HTMLImageElement>
  onClick?: () => void
}) {
  return (
    <img
      ref={ref}
      src={source}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={onError}
      onClick={onClick}
    />
  )
}
