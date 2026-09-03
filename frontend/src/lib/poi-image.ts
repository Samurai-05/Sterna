import { imageUrl } from './mock-data'

export type PoiImageVariant = 'map' | 'card' | 'detail'

export const poiImageWidths: Record<PoiImageVariant, number> = {
  map: 192,
  card: 640,
  detail: 1200,
}

export function getPoiImageUrl(
  source: string | undefined,
  fallbackImageId: string,
  variant: PoiImageVariant,
): string {
  const width = poiImageWidths[variant]
  if (!source) return imageUrl(fallbackImageId, width)

  try {
    // A base is required for the same-origin `/api/pois/:id/image` path the
    // backend now returns (proxied through this server rather than linking
    // to Wikimedia directly — see PoisService.getImage). Harmless for an
    // already-absolute URL, since `new URL` then ignores the base.
    const url = new URL(source, window.location.origin)
    url.searchParams.set('width', String(width))
    return url.toString()
  } catch {
    return source
  }
}
