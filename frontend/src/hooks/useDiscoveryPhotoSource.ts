import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import { getPhoto, type PhotoVariant } from '@/lib/api'
import { imageUrl, type Discovery } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'

export type DiscoveryPhotoSourceStatus = 'loading' | 'success' | 'error'

export function useDiscoveryPhotoSource({
  discovery,
  width = 800,
  variant = 'card',
  lazy = true,
  onSourceChange,
}: {
  discovery: Discovery
  width?: number
  variant?: PhotoVariant
  lazy?: boolean
  onSourceChange?: (source: string | null) => void
}): {
  source: string | null
  status: DiscoveryPhotoSourceStatus
  placeholderRef: RefObject<HTMLDivElement | null>
  onSourceError: () => void
} {
  const session = loadSession()
  const accessToken = session?.accessToken
  const imageObjectKey = discovery.imageObjectKey
  const placeholderRef = useRef<HTMLDivElement>(null)
  const objectUrlRef = useRef<string | undefined>(undefined)
  const [nearViewport, setNearViewport] = useState(
    () =>
      !lazy ||
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window),
  )
  const [status, setStatus] = useState<DiscoveryPhotoSourceStatus>(() => {
    if (!imageObjectKey) return 'success'
    return accessToken ? 'loading' : 'error'
  })
  const [loadedPhoto, setLoadedPhoto] = useState<{
    accessToken: string
    imageObjectKey: string
    source: string
    variant: PhotoVariant
  } | null>(null)

  const fallbackSource = imageObjectKey
    ? null
    : imageUrl(discovery.imageId, width)
  const loadedSource =
    loadedPhoto !== null &&
    loadedPhoto.accessToken === accessToken &&
    loadedPhoto.imageObjectKey === imageObjectKey &&
    loadedPhoto.variant === variant
      ? loadedPhoto.source
      : null
  const source = fallbackSource ?? loadedSource
  const effectiveStatus = fallbackSource
    ? 'success'
    : !accessToken
      ? 'error'
      : source
        ? 'success'
        : status

  useEffect(() => {
    if (!lazy || !imageObjectKey || !accessToken || nearViewport) return

    const placeholder = placeholderRef.current
    if (!placeholder) return

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
  }, [accessToken, imageObjectKey, lazy, nearViewport])

  useEffect(() => {
    let active = true

    if (!imageObjectKey || !accessToken || !nearViewport) return

    void getPhoto(accessToken, imageObjectKey, variant)
      .then(async (blob) => {
        const objectUrl = URL.createObjectURL(blob)

        if (!active) {
          URL.revokeObjectURL(objectUrl)
          return
        }

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

        setLoadedPhoto({
          accessToken,
          imageObjectKey,
          source: objectUrl,
          variant,
        })
        setStatus('success')
      })
      .catch(() => {
        if (active) {
          setLoadedPhoto(null)
          setStatus('error')
        }
      })

    return () => {
      active = false
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = undefined
      }
    }
  }, [accessToken, imageObjectKey, nearViewport, variant])

  useEffect(() => {
    onSourceChange?.(source)
    return () => onSourceChange?.(null)
  }, [onSourceChange, source])

  const onSourceError = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = undefined
    }
    setLoadedPhoto(null)
    setStatus('error')
    onSourceChange?.(null)
  }, [onSourceChange])

  return {
    source,
    status: effectiveStatus,
    placeholderRef,
    onSourceError,
  }
}
