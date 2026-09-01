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
    const url = new URL(source)
    url.searchParams.set('width', String(width))
    return url.toString()
  } catch {
    return source
  }
}
