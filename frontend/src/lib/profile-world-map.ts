export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 500
export const MAP_PADDING = 12

export type Coordinate = [number, number]

export type CountryGeometry =
  | { type: 'Polygon'; coordinates: Coordinate[][] }
  | { type: 'MultiPolygon'; coordinates: Coordinate[][][] }

const SHIFTS = [-360, 0, 360] as const

/**
 * Unwraps consecutive longitudes across the international date line so no two
 * adjacent vertices jump by more than 180 degrees.
 */
export function unwrapRingLongitudes(ring: Coordinate[]): Coordinate[] {
  if (ring.length === 0) return []

  const result: Coordinate[] = []
  let previous = ring[0][0]
  let offset = 0

  for (const [longitude, latitude] of ring) {
    let adjusted = longitude + offset

    while (adjusted - previous > 180) {
      offset -= 360
      adjusted -= 360
    }

    while (adjusted - previous < -180) {
      offset += 360
      adjusted += 360
    }

    result.push([adjusted, latitude])
    previous = adjusted
  }

  return result
}

export function ringBounds(ring: Coordinate[]): {
  minLng: number
  maxLng: number
} {
  let minLng = Infinity
  let maxLng = -Infinity

  for (const [lng] of ring) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  return { minLng, maxLng }
}

export function projectPoint(
  longitude: number,
  latitude: number,
): [number, number] {
  const x =
    MAP_PADDING + ((longitude + 180) / 360) * (MAP_WIDTH - MAP_PADDING * 2)
  const y =
    MAP_PADDING + ((90 - latitude) / 180) * (MAP_HEIGHT - MAP_PADDING * 2)
  return [x, y]
}

export function ringPath(ring: Coordinate[]): string {
  return ring
    .map(([longitude, latitude], index) => {
      const [x, y] = projectPoint(longitude, latitude)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .concat('Z')
    .join(' ')
}

/**
 * Projects GeoJSON Polygon or MultiPolygon geometries into an SVG path string,
 * duplicating dateline-crossing rings into wrapped copies in [-180, 180].
 */
export function projectCountryGeometry(geometry: CountryGeometry): string {
  const polygons: Coordinate[][][] =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

  const subpaths: string[] = []

  for (const polygon of polygons) {
    if (polygon.length === 0 || polygon[0].length === 0) continue

    const unwrappedPolygon = polygon.map(unwrapRingLongitudes)
    const outerRingBounds = ringBounds(unwrappedPolygon[0])

    for (const shift of SHIFTS) {
      const shiftedMin = outerRingBounds.minLng + shift
      const shiftedMax = outerRingBounds.maxLng + shift

      // Only draw copies whose outer bounding box intersects [-180, 180]
      if (shiftedMax >= -180 && shiftedMin <= 180) {
        for (const ring of unwrappedPolygon) {
          const shiftedRing: Coordinate[] = ring.map(([lng, lat]) => [
            lng + shift,
            lat,
          ])
          subpaths.push(ringPath(shiftedRing))
        }
      }
    }
  }

  return subpaths.join(' ')
}
