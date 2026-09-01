import { describe, expect, it } from 'vitest'

import type { Discovery } from './mock-data'
import {
  exploredCountryCodes,
  profileCategoryRows,
  recentProfileDiscoveries,
  uniqueProfileDiscoveries,
} from './profile-analytics'

function makeDiscovery(
  id: number,
  countryCode: string,
  discoveredAt: string,
  category: Discovery['category'] = 'landscape',
): Discovery {
  return {
    id,
    name: `Discovery ${id}`,
    category,
    location: 'Somewhere',
    imageId: `photo-${id}`,
    description: '',
    author: 'Explorer',
    initials: 'E',
    relativeDate: 'today',
    discoveredAt,
    coordinates: [0, 0],
    countryCode,
  }
}

describe('profile analytics', () => {
  it('counts each authored discovery once even when it has multiple group contexts', () => {
    const discovery = makeDiscovery(1, 'FRA', '2026-01-01T00:00:00.000Z')

    expect(
      uniqueProfileDiscoveries([
        discovery,
        { ...discovery, groupIds: ['group-a', 'group-b'] },
      ]),
    ).toHaveLength(1)
  })

  it('counts valid explored countries once and ignores unknown codes', () => {
    expect(
      exploredCountryCodes([
        makeDiscovery(1, 'FRA', '2026-01-01T00:00:00.000Z'),
        makeDiscovery(2, 'fra', '2026-01-02T00:00:00.000Z'),
        makeDiscovery(3, 'CHE', '2026-01-03T00:00:00.000Z'),
        makeDiscovery(4, 'UNK', '2026-01-04T00:00:00.000Z'),
      ]),
    ).toEqual(['FRA', 'CHE'])
  })

  it('sorts the recent preview by discoveredAt rather than createdAt', () => {
    const oldTrip = {
      ...makeDiscovery(1, 'FRA', '2024-01-01T00:00:00.000Z'),
      createdAt: '2026-08-31T00:00:00.000Z',
    }
    const recentTrip = {
      ...makeDiscovery(2, 'CHE', '2026-08-01T00:00:00.000Z'),
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    expect(
      recentProfileDiscoveries([oldTrip, recentTrip]).map((item) => item.id),
    ).toEqual([2, 1])
  })

  it('includes uncategorized discoveries in the full breakdown', () => {
    expect(
      profileCategoryRows([
        makeDiscovery(1, 'FRA', '2026-01-01T00:00:00.000Z'),
        makeDiscovery(2, 'CHE', '2026-01-02T00:00:00.000Z', null),
      ]),
    ).toEqual([
      { id: 'landscape', label: 'Landscape', count: 1 },
      { id: 'uncategorized', label: 'Uncategorized', count: 1 },
    ])
  })
})
