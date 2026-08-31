import { ImageOff } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type Ref,
  type ReactEventHandler,
} from 'react'

import { getPhoto, type PhotoVariant } from '@/lib/api'
import { imageUrl, type Discovery } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'
import { cn } from '@/lib/utils'

export function DiscoveryPhoto({
  discovery,
  alt,
  className,
  width = 800,
  variant = 'card',
}: {
  discovery: Discovery
  alt: string
  className?: string
  width?: number
  variant?: PhotoVariant
}) {
  const session = loadSession()

  if (!discovery.imageObjectKey) {
    return (
      <PhotoElement
        source={imageUrl(discovery.imageId, width)}
        alt={alt}
        className={className}
      />
    )
  }

  if (!session) {
    return <PhotoPlaceholder className={className} unavailable />
  }

  return (
    <AuthenticatedDiscoveryPhoto
      key={`${discovery.imageObjectKey}:${variant}`}
      accessToken={session.accessToken}
      imageObjectKey={discovery.imageObjectKey}
      alt={alt}
      className={className}
      variant={variant}
    />
  )
}

function AuthenticatedDiscoveryPhoto({
  accessToken,
  imageObjectKey,
  alt,
  className,
  variant,
}: {
  accessToken: string
  imageObjectKey: string
  alt: string
  className?: string
  variant: PhotoVariant
}) {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const objectUrlRef = useRef<string | undefined>(undefined)
  const [nearViewport, setNearViewport] = useState(
    () => typeof window === 'undefined' || !('IntersectionObserver' in window),
  )
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    const placeholder = placeholderRef.current
    if (!placeholder) return

    if (!('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '320px' },
    )
    observer.observe(placeholder)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let active = true

    if (!nearViewport) return

    void getPhoto(accessToken, imageObjectKey, variant)
      .then(async (blob) => {
        const objectUrl = URL.createObjectURL(blob)
        objectUrlRef.current = objectUrl

        const decodedImage = new Image()
        decodedImage.src = objectUrl
        try {
          await decodedImage.decode?.()
        } catch {
          if (objectUrlRef.current === objectUrl) {
            URL.revokeObjectURL(objectUrl)
            objectUrlRef.current = undefined
          }
          throw new Error('Unable to decode discovery photo.')
        }

        if (!active || objectUrlRef.current !== objectUrl) return

        objectUrlRef.current = objectUrl
        setSource(objectUrl)
        setStatus('success')
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => {
      active = false
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = undefined
      }
    }
  }, [accessToken, imageObjectKey, nearViewport, variant])

  const handleImageError: ReactEventHandler<HTMLImageElement> = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = undefined
    }
    setSource(null)
    setStatus('error')
  }

  if (status !== 'success' || !source) {
    return (
      <PhotoPlaceholder
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
      onError={handleImageError}
    />
  )
}

function PhotoPlaceholder({
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
}: {
  ref?: Ref<HTMLImageElement>
  source: string
  alt: string
  className?: string
  onError?: ReactEventHandler<HTMLImageElement>
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
    />
  )
}
