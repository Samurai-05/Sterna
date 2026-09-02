import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'

import { getPhoto, type PhotoVariant } from '@/lib/api'
import { imageUrl, type Discovery } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'

export type DiscoveryPhotoSourceStatus = 'loading' | 'success' | 'error'
export type DiscoveryPhotoLoadState = 'idle' | DiscoveryPhotoSourceStatus

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

/**
 * Loads the active gallery photo and its immediate neighbours. Each slide has
 * an explicit load state so the Lightbox can stay mounted while one photo is
 * still loading or unavailable.
 */
export function useDiscoveryPhotoSources({
  discoveries,
  activeIndex,
  width = 1200,
  variant = 'detail',
}: {
  discoveries: Discovery[]
  activeIndex: number
  width?: number
  variant?: PhotoVariant
}): {
  sources: Record<number, string>
  status: DiscoveryPhotoSourceStatus
  states: Record<number, DiscoveryPhotoLoadState>
  placeholderRef: RefObject<HTMLDivElement | null>
  onSourceError: (discoveryId: number) => void
} {
  const session = loadSession()
  const accessToken = session?.accessToken
  const placeholderRef = useRef<HTMLDivElement>(null)
  const sourceUrlsRef = useRef(new Map<string, string>())
  const pendingRequestsRef = useRef(new Map<string, Promise<string>>())
  const desiredKeysRef = useRef(new Set<string>())
  const mountedRef = useRef(true)
  const [sources, setSources] = useState<Record<number, string>>({})
  const [states, setStates] = useState<Record<number, DiscoveryPhotoLoadState>>(
    {},
  )

  const currentDiscovery = discoveries[activeIndex]
  const desiredDiscoveries = useMemo(() => {
    if (!discoveries.length) return []

    return [
      discoveries[activeIndex - 1],
      discoveries[activeIndex],
      discoveries[activeIndex + 1],
    ].filter((discovery): discovery is Discovery => Boolean(discovery))
  }, [activeIndex, discoveries])

  useEffect(() => {
    let releaseTimer: number | undefined
    const allKeys = new Set(
      discoveries.map((discovery) =>
        photoSourceKey(discovery, accessToken, variant),
      ),
    )
    const desiredKeys = new Set(
      desiredDiscoveries.map((discovery) =>
        photoSourceKey(discovery, accessToken, variant),
      ),
    )
    desiredKeysRef.current = desiredKeys

    const keysToRelease = [...sourceUrlsRef.current.keys()].filter(
      (key) => !allKeys.has(key) || !desiredKeys.has(key),
    )
    if (keysToRelease.length > 0) {
      releaseTimer = window.setTimeout(() => {
        if (!mountedRef.current) return
        for (const key of keysToRelease) {
          if (desiredKeysRef.current.has(key)) continue
          const objectUrl = sourceUrlsRef.current.get(key)
          if (!objectUrl) continue
          URL.revokeObjectURL(objectUrl)
          sourceUrlsRef.current.delete(key)
        }
        setSources((current) => {
          const next = { ...current }
          for (const [id] of Object.entries(current)) {
            const discovery = discoveries.find((item) => String(item.id) === id)
            if (
              discovery &&
              discovery.imageObjectKey &&
              !sourceUrlsRef.current.has(
                photoSourceKey(discovery, accessToken, variant),
              )
            ) {
              delete next[Number(id)]
            }
          }
          return next
        })
        setStates((current) => {
          const next = { ...current }
          for (const discovery of discoveries) {
            if (
              discovery.imageObjectKey &&
              !sourceUrlsRef.current.has(
                photoSourceKey(discovery, accessToken, variant),
              ) &&
              !desiredKeysRef.current.has(
                photoSourceKey(discovery, accessToken, variant),
              )
            ) {
              delete next[discovery.id]
            }
          }
          return next
        })
      }, 0)
    }

    if (!accessToken)
      return () => {
        if (releaseTimer !== undefined) window.clearTimeout(releaseTimer)
      }

    for (const discovery of desiredDiscoveries) {
      const key = photoSourceKey(discovery, accessToken, variant)
      if (!discovery.imageObjectKey) {
        continue
      }
      if (sourceUrlsRef.current.has(key)) {
        const source = sourceUrlsRef.current.get(key)!
        setSources((current) =>
          current[discovery.id] === source
            ? current
            : { ...current, [discovery.id]: source },
        )
        continue
      }

      let request = pendingRequestsRef.current.get(key)
      if (!request) {
        request = getPhoto(accessToken, discovery.imageObjectKey, variant).then(
          async (blob) => {
            const objectUrl = URL.createObjectURL(blob)
            try {
              await decodePhoto(objectUrl)
              return objectUrl
            } catch (error) {
              URL.revokeObjectURL(objectUrl)
              throw error
            }
          },
        )
        pendingRequestsRef.current.set(key, request)
      }

      void request
        .then((objectUrl) => {
          pendingRequestsRef.current.delete(key)
          if (!mountedRef.current || !desiredKeysRef.current.has(key)) {
            URL.revokeObjectURL(objectUrl)
            return
          }

          sourceUrlsRef.current.set(key, objectUrl)
          setSources((current) => ({ ...current, [discovery.id]: objectUrl }))
          setStates((current) => ({ ...current, [discovery.id]: 'success' }))
        })
        .catch(() => {
          pendingRequestsRef.current.delete(key)
          if (mountedRef.current && desiredKeysRef.current.has(key)) {
            setStates((current) => ({ ...current, [discovery.id]: 'error' }))
          }
        })
    }

    return () => {
      if (releaseTimer !== undefined) window.clearTimeout(releaseTimer)
    }
  }, [
    accessToken,
    currentDiscovery,
    desiredDiscoveries,
    discoveries,
    variant,
    width,
  ])

  useEffect(() => {
    const sourceUrls = sourceUrlsRef.current
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      for (const objectUrl of sourceUrls.values()) {
        URL.revokeObjectURL(objectUrl)
      }
      sourceUrls.clear()
    }
  }, [])

  const visibleSources = useMemo(() => {
    const next: Record<number, string> = {}
    const desiredIds = new Set(desiredDiscoveries.map((item) => item.id))

    for (const [id, source] of Object.entries(sources)) {
      if (desiredIds.has(Number(id))) {
        next[Number(id)] = source
      }
    }

    return next
  }, [desiredDiscoveries, sources])
  const currentSource = currentDiscovery
    ? (visibleSources[currentDiscovery.id] ??
      (!currentDiscovery.imageObjectKey
        ? imageUrl(currentDiscovery.imageId, width)
        : null))
    : null
  const visibleStates = useMemo(() => {
    const next: Record<number, DiscoveryPhotoLoadState> = {}
    for (const discovery of desiredDiscoveries) {
      next[discovery.id] = discovery.imageObjectKey
        ? sources[discovery.id]
          ? 'success'
          : (states[discovery.id] ?? 'loading')
        : 'success'
    }
    return next
  }, [desiredDiscoveries, sources, states])
  const status: DiscoveryPhotoSourceStatus = currentSource
    ? 'success'
    : currentDiscovery?.imageObjectKey && !accessToken
      ? 'error'
      : visibleStates[currentDiscovery?.id ?? -1] === 'error'
        ? 'error'
        : 'loading'

  const onSourceError = useCallback(
    (discoveryId: number) => {
      const failedDiscovery = discoveries.find(
        (discovery) => discovery.id === discoveryId,
      )
      if (!failedDiscovery) return

      const failedKey = photoSourceKey(failedDiscovery, accessToken, variant)
      const objectUrl = sourceUrlsRef.current.get(failedKey)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        sourceUrlsRef.current.delete(failedKey)
      }
      setSources((current) => {
        const next = { ...current }
        delete next[discoveryId]
        return next
      })
      setStates((current) => ({ ...current, [discoveryId]: 'error' }))
    },
    [accessToken, discoveries, variant],
  )

  return {
    sources: visibleSources,
    status,
    states: visibleStates,
    placeholderRef,
    onSourceError,
  }
}

async function decodePhoto(objectUrl: string) {
  const image = new Image()
  image.src = objectUrl

  if (typeof image.decode === 'function') {
    await image.decode()
  }
}

function photoSourceKey(
  discovery: Discovery | undefined,
  accessToken: string | undefined,
  variant: PhotoVariant,
) {
  return `${accessToken ?? 'anonymous'}:${discovery?.imageObjectKey ?? discovery?.imageId ?? 'missing'}:${variant}`
}
