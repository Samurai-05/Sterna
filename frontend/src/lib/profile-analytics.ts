import { getCountryName } from '@/lib/countries'
import {
  categories,
  type Discovery,
  type DiscoveryCategory,
} from '@/lib/mock-data'

export const PROFILE_RECENT_DISCOVERY_COUNT = 3

export interface ProfileCategoryRow {
  id: DiscoveryCategory | 'uncategorized'
  label: string
  count: number
}

/** De-duplicates the authored endpoint by discovery id before aggregating it. */
export function uniqueProfileDiscoveries(
  sourceDiscoveries: Discovery[],
): Discovery[] {
  return [...new Map(sourceDiscoveries.map((item) => [item.id, item])).values()]
}

export function exploredCountryCodes(sourceDiscoveries: Discovery[]): string[] {
  return [
    ...new Set(
      uniqueProfileDiscoveries(sourceDiscoveries)
        .map((discovery) => discovery.countryCode.trim().toUpperCase())
        .filter((countryCode) => Boolean(getCountryName(countryCode))),
    ),
  ]
}

export function recentProfileDiscoveries(
  sourceDiscoveries: Discovery[],
  limit = PROFILE_RECENT_DISCOVERY_COUNT,
): Discovery[] {
  return uniqueProfileDiscoveries(sourceDiscoveries)
    .map((discovery, index) => ({
      discovery,
      index,
      timestamp: timestampValue(discovery.discoveredAt),
    }))
    .sort(
      (left, right) =>
        right.timestamp - left.timestamp || left.index - right.index,
    )
    .slice(0, limit)
    .map(({ discovery }) => discovery)
}

export function profileCategoryRows(
  sourceDiscoveries: Discovery[],
): ProfileCategoryRow[] {
  const discoveries = uniqueProfileDiscoveries(sourceDiscoveries)
  const rows: ProfileCategoryRow[] = categories
    .map((category) => ({
      ...category,
      count: discoveries.filter(
        (discovery) => discovery.category === category.id,
      ).length,
    }))
    .filter((category) => category.count > 0)

  const uncategorizedCount = discoveries.filter(
    (discovery) => discovery.category === null,
  ).length

  if (uncategorizedCount > 0) {
    rows.push({
      id: 'uncategorized',
      label: 'Uncategorized',
      count: uncategorizedCount,
    })
  }

  return rows
}

function timestampValue(value?: string): number {
  if (!value) return Number.NEGATIVE_INFINITY

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}
