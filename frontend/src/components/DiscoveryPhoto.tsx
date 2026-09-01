import { useEffect, useState } from 'react'

import { imageUrl, type Discovery } from '@/lib/mock-data'
import { acquirePhotoUrl, releasePhotoUrl } from '@/lib/photo-url-cache'
import { loadSession } from '@/lib/session'
import { cn } from '@/lib/utils'

export function DiscoveryPhoto({
  discovery,
  alt,
  className,
  width = 800,
}: {
  discovery: Discovery
  alt: string
  className?: string
  width?: number
}) {
  const session = loadSession()
  const fallback = imageUrl(discovery.imageId, width)

  if (!session || !discovery.imageObjectKey) {
    return <PhotoElement source={fallback} alt={alt} className={className} />
  }

  return (
    <AuthenticatedDiscoveryPhoto
      accessToken={session.accessToken}
      imageObjectKey={discovery.imageObjectKey}
      alt={alt}
      className={className}
    />
  )
}

function AuthenticatedDiscoveryPhoto({
  accessToken,
  imageObjectKey,
  alt,
  className,
}: {
  accessToken: string
  imageObjectKey: string
  alt: string
  className?: string
}) {
  const requestKey = `${accessToken}\n${imageObjectKey}`
  const [photoState, setPhotoState] = useState<{
    requestKey: string
    source?: string
    loaded: boolean
    failed: boolean
  }>({ requestKey, loaded: false, failed: false })
  const currentState =
    photoState.requestKey === requestKey
      ? photoState
      : { requestKey, loaded: false, failed: false }

  useEffect(() => {
    let active = true

    void acquirePhotoUrl(accessToken, imageObjectKey)
      .then((objectUrl) => {
        if (!active) return
        setPhotoState({
          requestKey,
          source: objectUrl,
          loaded: false,
          failed: false,
        })
      })
      .catch(() => {
        if (active) {
          setPhotoState({ requestKey, loaded: false, failed: true })
        }
      })

    return () => {
      active = false
      releasePhotoUrl(accessToken, imageObjectKey)
    }
  }, [accessToken, imageObjectKey, requestKey])

  return (
    <span
      role={!currentState.source && alt ? 'img' : undefined}
      aria-label={!currentState.source && alt ? alt : undefined}
      aria-hidden={!currentState.source && !alt ? 'true' : undefined}
      className={cn(
        'relative block overflow-hidden bg-muted',
        !currentState.loaded && !currentState.failed && 'animate-pulse',
        className,
      )}
    >
      {currentState.source && (
        <img
          src={currentState.source}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() =>
            setPhotoState((state) =>
              state.requestKey === requestKey
                ? { ...state, loaded: true }
                : state,
            )
          }
          onError={() =>
            setPhotoState((state) =>
              state.requestKey === requestKey
                ? { ...state, failed: true }
                : state,
            )
          }
          className={`size-full object-cover transition-opacity duration-200 ${currentState.loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </span>
  )
}

function PhotoElement({
  source,
  alt,
  className,
}: {
  source: string
  alt: string
  className?: string
}) {
  return (
    <img
      src={source}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  )
}
