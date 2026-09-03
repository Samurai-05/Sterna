import { describe, expect, it } from 'vitest'

import type { Discovery } from './mock-data'
import {
  exploredCountryCodes,
  explorationOverTime,
  mapExploredCountryCodes,
  profileCategoryRows,
  recentProfileDiscoveries,
  uniqueProfileDiscoveries,
} from './profile-analytics'

function makeDiscovery(
  id: number,
  countryCode: string,
  createdAt?: string,
  category: Discovery['category'] = 'landscape',
  discoveredAt?: string,
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
    coordinates: [0, 0],
    countryCode,
    ...(createdAt ? { createdAt } : {}),
    ...(discoveredAt ? { discoveredAt } : {}),
  }
}

describe('profile analytics', () => {
  it('deduplicates authored discoveries before calculating profile totals', () => {
    const discovery = makeDiscovery(1, 'FRA')

    expect(
      uniqueProfileDiscoveries([
        discovery,
        { ...discovery, groupIds: ['group-a', 'group-b'] },
      ]),
    ).toHaveLength(1)
  })

  it('keeps canonical country counts separate from disputed map features', () => {
    expect(
      exploredCountryCodes([
        makeDiscovery(1, ' fra '),
        makeDiscovery(2, 'FRA'),
        makeDiscovery(3, 'CHE'),
        makeDiscovery(4, 'UNK'),
      ]),
    ).toEqual(['FRA', 'CHE'])
    expect(mapExploredCountryCodes(['UKR'])).toEqual(['UKR', 'XCR'])
  })

  it('A: counts July when createdAt = September and discoveredAt = July in explorationOverTime', () => {
    const discovery = makeDiscovery(
      1,
      'FRA',
      '2026-09-03T10:00:00.000Z',
      'landscape',
      '2026-07-10T14:30:00.000Z',
    )

    const timeline = explorationOverTime(
      [discovery],
      new Date('2026-09-15T12:00:00.000Z'),
    )

    expect(timeline.find((m) => m.key === '2026-07')?.count).toBe(1)
    expect(timeline.find((m) => m.key === '2026-09')?.count).toBe(0)
  })

  it('B: sorts Recent discoveries by discoveredAt even when most recently created has oldest discoveredAt', () => {
    const olderCreationNewerDiscovery = makeDiscovery(
      1,
      'FRA',
      '2026-08-01T00:00:00.000Z',
      'landscape',
      '2026-08-15T00:00:00.000Z',
    )
    const newerCreationOlderDiscovery = makeDiscovery(
      2,
      'CHE',
      '2026-09-03T00:00:00.000Z',
      'landscape',
      '2026-07-10T00:00:00.000Z',
    )

    const recent = recentProfileDiscoveries([
      olderCreationNewerDiscovery,
      newerCreationOlderDiscovery,
    ])

    expect(recent.map((d) => d.id)).toEqual([1, 2])
  })

  it('C: safely falls back to createdAt for legacy Discovery without discoveredAt', () => {
    const legacyOld = makeDiscovery(1, 'FRA', '2026-07-01T00:00:00.000Z')
    const legacyRecent = makeDiscovery(2, 'CHE', '2026-09-01T00:00:00.000Z')

    expect(
      recentProfileDiscoveries([legacyOld, legacyRecent]).map(
        (item) => item.id,
      ),
    ).toEqual([2, 1])
    expect(
      explorationOverTime(
        [legacyOld, legacyRecent],
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

  it('returns only categories present in unique authored discoveries', () => {
    expect(
      profileCategoryRows([
        makeDiscovery(1, 'FRA', undefined, 'landscape'),
        makeDiscovery(2, 'CHE', undefined, 'food'),
        makeDiscovery(2, 'CHE', undefined, 'food'),
      ]),
    ).toEqual([
      { id: 'landscape', label: 'Landscape', count: 1 },
      { id: 'food', label: 'Food', count: 1 },
    ])
  })
})
