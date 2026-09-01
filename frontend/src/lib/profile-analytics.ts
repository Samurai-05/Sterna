import { getCountryName } from '@/lib/countries'
import { normalizeExploredCountryCodes } from '@/lib/country-exploration'
import {
  categories,
  type Discovery,
  type DiscoveryCategory,
} from '@/lib/mock-data'

export const PROFILE_RECENT_DISCOVERY_COUNT = 3

export const profileCategoryAppearance = {
  landscape: {
    color: '#2F6B8A',
    icon: 'text-[#2F6B8A]',
    background: 'bg-[#EAF3F7]',
  },
  monument: {
    color: '#7E6552',
    icon: 'text-[#7E6552]',
    background: 'bg-[#F1E9E4]',
  },
  food: {
    color: '#B8572B',
    icon: 'text-[#B8572B]',
    background: 'bg-[#FBF1EC]',
  },
  animal: {
    color: '#3F7A78',
    icon: 'text-[#3F7A78]',
    background: 'bg-[#E8F2F1]',
  },
  plant: {
    color: '#3F724E',
    icon: 'text-[#3F724E]',
    background: 'bg-[#F0F7F3]',
  },
  culture: {
    color: '#756B8F',
    icon: 'text-[#756B8F]',
    background: 'bg-[#F1EEF7]',
  },
  other: {
    color: '#9C7A32',
    icon: 'text-[#9C7A32]',
    background: 'bg-[#FBF4E2]',
  },
} as const

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
  return normalizeExploredCountryCodes(
    uniqueProfileDiscoveries(sourceDiscoveries)
      .map((discovery) => discovery.countryCode)
      .filter((countryCode) => Boolean(getCountryName(countryCode))),
  )
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
