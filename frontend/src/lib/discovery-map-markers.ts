import type { DiscoveryCategory } from '@/lib/mock-data'
import type { FeatureCollection, Point } from 'geojson'

export const DISCOVERY_SOURCE_ID = 'sterna-discoveries'
export const DISCOVERY_DOT_LAYER_ID = 'sterna-discovery-dots'

export const DISCOVERY_CLUSTER_RADIUS = 40
export const DISCOVERY_CLUSTER_MAX_ZOOM = 18

export const DISCOVERY_DOT_END_ZOOM = 4.2
export const DISCOVERY_BADGE_FULL_ZOOM = 5.2
export const DISCOVERY_MARKER_FULL_ZOOM = 7
export const DISCOVERY_PHOTO_MORPH_START_ZOOM = 11.5
export const DISCOVERY_PHOTO_FULL_ZOOM = 12.8

export const DISCOVERY_STACK_MIN_ZOOM = 13
export const DISCOVERY_STACK_EXPANSION_ZOOM = 16

export const DISCOVERY_DOT_SIZE = 8
export const DISCOVERY_BADGE_SIZE = 26
export const DISCOVERY_MARKER_SIZE = 34
export const DISCOVERY_PHOTO_SIZE = 56

const discoveryMapColors: Record<DiscoveryCategory, string> = {
  landscape: '#2563EB',
  monument: '#BE123C',
  food: '#EA580C',
  animal: '#0891B2',
  plant: '#16A34A',
  culture: '#7C3AED',
  other: '#2D5A3D',
}

export const DISCOVERY_CLUSTER_PROPERTIES = {
  landscapeCount: [
    '+',
    ['case', ['==', ['get', 'category'], 'landscape'], 1, 0],
  ],
  monumentCount: ['+', ['case', ['==', ['get', 'category'], 'monument'], 1, 0]],
  foodCount: ['+', ['case', ['==', ['get', 'category'], 'food'], 1, 0]],
  animalCount: ['+', ['case', ['==', ['get', 'category'], 'animal'], 1, 0]],
  plantCount: ['+', ['case', ['==', ['get', 'category'], 'plant'], 1, 0]],
  cultureCount: ['+', ['case', ['==', ['get', 'category'], 'culture'], 1, 0]],
  otherCount: ['+', ['case', ['==', ['get', 'category'], 'other'], 1, 0]],
} as const

export const DISCOVERY_MAP_COLOR_EXPRESSION = [
  'match',
  ['get', 'category'],
  'landscape',
  discoveryMapColors.landscape,
  'monument',
  discoveryMapColors.monument,
  'food',
  discoveryMapColors.food,
  'animal',
  discoveryMapColors.animal,
  'plant',
  discoveryMapColors.plant,
  'culture',
  discoveryMapColors.culture,
  discoveryMapColors.other,
] as const

export interface DiscoveryFeatureInput {
  id: number
  category: DiscoveryCategory
  coordinates: [number, number]
}

export function getDiscoveryMapColor(category: DiscoveryCategory): string {
  return discoveryMapColors[category]
}

export function toDiscoveryFeatureCollection(
  discoveries: DiscoveryFeatureInput[],
): FeatureCollection<Point, { category: DiscoveryCategory }> {
  return {
    type: 'FeatureCollection',
    features: discoveries.map((discovery) => ({
      type: 'Feature',
      id: discovery.id,
      geometry: {
        type: 'Point',
        coordinates: discovery.coordinates,
      },
      properties: {
        category: discovery.category,
      },
    })),
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function progress(value: number, from: number, to: number) {
  return clamp01((value - from) / (to - from))
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

export interface DiscoveryMarkerVisual {
  domOpacity: number
  size: number
  borderRadius: number
  iconOpacity: number
  colorOpacity: number
  photoOpacity: number
  borderWidth: number
}

export function getDiscoveryMarkerVisual(zoom: number): DiscoveryMarkerVisual {
  const badgeT = progress(
    zoom,
    DISCOVERY_DOT_END_ZOOM,
    DISCOVERY_BADGE_FULL_ZOOM,
  )
  const markerT = progress(
    zoom,
    DISCOVERY_BADGE_FULL_ZOOM,
    DISCOVERY_MARKER_FULL_ZOOM,
  )
  const photoT = progress(
    zoom,
    DISCOVERY_PHOTO_MORPH_START_ZOOM,
    DISCOVERY_PHOTO_FULL_ZOOM,
  )

  const categorySize =
    zoom <= DISCOVERY_BADGE_FULL_ZOOM
      ? lerp(DISCOVERY_DOT_SIZE, DISCOVERY_BADGE_SIZE, badgeT)
      : lerp(DISCOVERY_BADGE_SIZE, DISCOVERY_MARKER_SIZE, markerT)
  const size = lerp(categorySize, DISCOVERY_PHOTO_SIZE, photoT)

  return {
    domOpacity: badgeT,
    size,
    borderRadius: lerp(DISCOVERY_MARKER_SIZE / 2, 12, photoT),
    iconOpacity: badgeT * (1 - photoT),
    colorOpacity: 1 - photoT,
    photoOpacity: photoT,
    borderWidth: lerp(1.5, 2, photoT),
  }
}
