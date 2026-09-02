import type { Location } from 'react-router'

export type DiscoveryRouteState = {
  returnTo?: string
  backgroundLocation?: Location
  justCreated?: boolean
  galleryIds?: number[]
  gallerySource?: 'personal' | 'group' | 'all-groups'
}

export function getDiscoveryRouteState(state: unknown): DiscoveryRouteState {
  if (!isRecord(state)) {
    return {}
  }

  return {
    returnTo: typeof state.returnTo === 'string' ? state.returnTo : undefined,
    backgroundLocation: isLocation(state.backgroundLocation)
      ? state.backgroundLocation
      : undefined,
    justCreated: state.justCreated === true ? true : undefined,
    galleryIds: isNumberArray(state.galleryIds) ? state.galleryIds : undefined,
    gallerySource: isGallerySource(state.gallerySource)
      ? state.gallerySource
      : undefined,
  }
}

function isLocation(value: unknown): value is Location {
  return (
    isRecord(value) &&
    typeof value.pathname === 'string' &&
    typeof value.search === 'string' &&
    typeof value.hash === 'string' &&
    typeof value.key === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  )
}

function isGallerySource(
  value: unknown,
): value is NonNullable<DiscoveryRouteState['gallerySource']> {
  return value === 'personal' || value === 'group' || value === 'all-groups'
}
