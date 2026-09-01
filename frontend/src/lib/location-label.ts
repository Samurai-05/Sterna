import { getCountryName } from '@/lib/countries'
import type { Discovery, Landmark } from '@/lib/mock-data'

export function discoveryLocationLabel(
  discovery: Pick<Discovery, 'countryCode'>,
): string {
  return getCountryName(discovery.countryCode) ?? 'Unknown country'
}

export function landmarkLocationLabel(
  landmark: Pick<Landmark, 'city' | 'country'>,
): string {
  if (landmark.city && landmark.country) {
    return `${landmark.city}, ${landmark.country}`
  }

  return landmark.city || landmark.country || 'Unknown country'
}
