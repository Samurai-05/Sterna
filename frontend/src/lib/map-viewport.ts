export type MapViewport = {
  center: [number, number]
  zoom: number
}

export const defaultMapViewport: MapViewport = {
  center: [2.3522, 48.8566],
  zoom: 12,
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
