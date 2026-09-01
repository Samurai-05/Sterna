import type { Location } from 'react-router'

export type DiscoveryRouteState = {
  returnTo?: string
  backgroundLocation?: Location
  justCreated?: boolean
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
