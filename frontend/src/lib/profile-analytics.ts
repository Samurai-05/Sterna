import { getCountryName } from '@/lib/countries'
import {
  categories,
  type Discovery,
  type DiscoveryCategory,
} from '@/lib/mock-data'

export const PROFILE_RECENT_DISCOVERY_COUNT = 3

export interface ProfileCategoryRow {
  id: DiscoveryCategory
  label: string
  count: number
}

export interface ProfileExplorationMonth {
  key: string
  label: string
  count: number
}

/** The authored endpoint can contain one row per group context. */
export function uniqueProfileDiscoveries(
  sourceDiscoveries: Discovery[],
): Discovery[] {
  return [...new Map(sourceDiscoveries.map((item) => [item.id, item])).values()]
}

/** Returns valid, displayable country codes without changing API semantics. */
export function exploredCountryCodes(sourceDiscoveries: Discovery[]): string[] {
  return [
    ...new Set(
      uniqueProfileDiscoveries(sourceDiscoveries)
        .map((discovery) => discovery.countryCode.trim().toUpperCase())
        .filter((countryCode) => Boolean(getCountryName(countryCode))),
    ),
  ]
}

/** Includes the map's disputed-zone features while keeping the list canonical. */
export function mapExploredCountryCodes(codes: string[]): string[] {
  const expandedCodes = new Set(codes)
  const disputedZones: Record<string, string[]> = {
    XCR: ['RUS', 'UKR'],
    XWS: ['MAR', 'ESH'],
  }

  for (const [zone, claims] of Object.entries(disputedZones)) {
    if (claims.some((claim) => expandedCodes.has(claim))) {
      expandedCodes.add(zone)
    }
  }

  return [...expandedCodes]
}

export function recentProfileDiscoveries(
  sourceDiscoveries: Discovery[],
  limit = PROFILE_RECENT_DISCOVERY_COUNT,
): Discovery[] {
  return uniqueProfileDiscoveries(sourceDiscoveries)
    .map((discovery, index) => ({
      discovery,
      index,
      timestamp: timestampValue(discovery.createdAt),
    }))
    .sort(
      (left, right) =>
        right.timestamp - left.timestamp || left.index - right.index,
    )
    .slice(0, limit)
    .map(({ discovery }) => discovery)
}

export function explorationOverTime(
  sourceDiscoveries: Discovery[],
  referenceDate = new Date(),
): ProfileExplorationMonth[] {
  const currentMonth = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  )
  const months = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - (5 - index),
        1,
      ),
    )

    return {
      key: month.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat('en', {
        month: 'short',
        timeZone: 'UTC',
      }).format(month),
      count: 0,
    }
  })
  const monthByKey = new Map(months.map((month) => [month.key, month]))

  uniqueProfileDiscoveries(sourceDiscoveries).forEach((discovery) => {
    const timestamp = timestampValue(discovery.createdAt)
    if (!Number.isFinite(timestamp)) return

    const month = monthByKey.get(new Date(timestamp).toISOString().slice(0, 7))
    if (month) month.count += 1
  })

  return months
}

export function profileCategoryRows(
  sourceDiscoveries: Discovery[],
): ProfileCategoryRow[] {
  const discoveries = uniqueProfileDiscoveries(sourceDiscoveries)

  return categories
    .map((category) => ({
      ...category,
      count: discoveries.filter(
        (discovery) => discovery.category === category.id,
      ).length,
    }))
    .filter((category) => category.count > 0)
}

function timestampValue(value?: string): number {
  if (!value) return Number.NEGATIVE_INFINITY

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}
