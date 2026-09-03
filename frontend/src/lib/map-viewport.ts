export type MapViewport = {
  center: [number, number]
  zoom: number
}

type GlobeContainerDimensions = {
  clientWidth: number
  clientHeight: number
  getBoundingClientRect?: () => { width: number; height: number }
}

type GlobeMap = {
  getContainer: () => GlobeContainerDimensions
  cameraForBounds: (
    bounds: [[number, number], [number, number]],
    options: { padding: number },
  ) => { zoom?: number } | null | undefined
}

const worldBounds: [[number, number], [number, number]] = [
  [-180, -85.051129],
  [180, 85.051129],
]
const globeMinimumZoomOffset = 2

export function getGlobeFitPadding({
  width,
  height,
}: {
  width: number
  height: number
}): number {
  const smallestDimension = Math.min(
    Number.isFinite(width) && width > 0 ? width : 0,
    Number.isFinite(height) && height > 0 ? height : 0,
  )
  return Math.max(8, Math.round(smallestDimension * 0.06))
}

export function getResponsiveGlobeMinimumZoom(map: GlobeMap): number | null {
  const container = map.getContainer()
  const rect = container.getBoundingClientRect?.()
  const width = container.clientWidth || rect?.width || 0
  const height = container.clientHeight || rect?.height || 0

  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  if (width <= 0 || height <= 0) return null

  const camera = map.cameraForBounds(worldBounds, {
    padding: getGlobeFitPadding({ width, height }),
  })
  return typeof camera?.zoom === 'number' && Number.isFinite(camera.zoom)
    ? camera.zoom + globeMinimumZoomOffset
    : null
}

export const defaultGlobeViewport: MapViewport = {
  center: [0, 20],
  zoom: 1.5,
}

const mapViewportStorageKey = 'sterna.mapViewport'

export function getStoredMapViewport(): MapViewport | null {
  try {
    const rawViewport = window.sessionStorage.getItem(mapViewportStorageKey)
    if (!rawViewport) return null

    const parsed: unknown = JSON.parse(rawViewport)
    if (!isMapViewport(parsed)) return null

    return parsed
  } catch {
    return null
  }
}

export function saveMapViewport(viewport: MapViewport): void {
  try {
    window.sessionStorage.setItem(
      mapViewportStorageKey,
      JSON.stringify(viewport),
    )
  } catch {
    // Viewport persistence is best effort when storage is unavailable.
  }
}

function isMapViewport(value: unknown): value is MapViewport {
  if (!value || typeof value !== 'object') return false

  const { center, zoom } = value as {
    center?: unknown
    zoom?: unknown
  }

  return (
    Array.isArray(center) &&
    center.length === 2 &&
    typeof center[0] === 'number' &&
    Number.isFinite(center[0]) &&
    center[0] >= -180 &&
    center[0] <= 180 &&
    typeof center[1] === 'number' &&
    Number.isFinite(center[1]) &&
    center[1] >= -90 &&
    center[1] <= 90 &&
    typeof zoom === 'number' &&
    Number.isFinite(zoom)
  )
}
