import { useEffect, useState } from 'react'

import { getPhoto } from '@/lib/api'
import { imageUrl, type Discovery } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'

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
      fallback={fallback}
      alt={alt}
      className={className}
    />
  )
}

function AuthenticatedDiscoveryPhoto({
  accessToken,
  imageObjectKey,
  fallback,
  alt,
  className,
}: {
  accessToken: string
  imageObjectKey: string
  fallback: string
  alt: string
  className?: string
}) {
  const [source, setSource] = useState(fallback)

  useEffect(() => {
    let active = true
    let objectUrl: string | undefined

    void getPhoto(accessToken, imageObjectKey)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setSource(objectUrl)
      })
      .catch(() => {
        if (active) setSource(fallback)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessToken, fallback, imageObjectKey])

  return <PhotoElement source={source} alt={alt} className={className} />
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
  return <img src={source} alt={alt} className={className} loading="lazy" />
}
