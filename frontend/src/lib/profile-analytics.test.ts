import { describe, expect, it } from 'vitest'

import type { Discovery } from './mock-data'
import {
  exploredCountryCodes,
  explorationOverTime,
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

  it('aggregates the last six calendar months from discoveredAt only', () => {
    const importedOldTrip = {
      ...makeDiscovery(1, 'FRA', '2024-01-01T00:00:00.000Z'),
      createdAt: '2026-09-10T00:00:00.000Z',
    }
    const summerDiscovery = {
      ...makeDiscovery(2, 'CHE', '2026-07-04T00:00:00.000Z'),
      createdAt: '2026-09-10T00:00:00.000Z',
    }
    const currentDiscovery = makeDiscovery(3, 'ITA', '2026-09-01T00:00:00.000Z')

    expect(
      explorationOverTime(
        [
          importedOldTrip,
          summerDiscovery,
          currentDiscovery,
          makeDiscovery(4, 'ESP', 'not-a-date'),
          { ...currentDiscovery, id: 5, discoveredAt: undefined },
        ],
        new Date('2026-09-15T12:00:00.000Z'),
      ),
    ).toEqual([
      { key: '2026-04', label: 'Apr', count: 0 },
      { key: '2026-05', label: 'May', count: 0 },
      { key: '2026-06', label: 'Jun', count: 0 },
      { key: '2026-07', label: 'Jul', count: 1 },
      { key: '2026-08', label: 'Aug', count: 0 },
      { key: '2026-09', label: 'Sep', count: 1 },
    ])
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
