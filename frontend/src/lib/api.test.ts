import { afterEach, describe, expect, it, vi } from 'vitest'

import { getDiscoveries, getGroupDiscoveries } from './api'

const personalDiscovery = apiDiscovery({ id: '1', groupId: null })
const groupDiscovery = apiDiscovery({ id: '2', groupId: '7' })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('discovery map boundaries', () => {
  it('keeps group discoveries out of the personal map response', async () => {
    mockDiscoveryResponse([personalDiscovery, groupDiscovery])

    const result = await getDiscoveries('token')

    expect(result.map((discovery) => discovery.id)).toEqual([1])
  })

  it('keeps personal and other-group discoveries out of a group map', async () => {
    const otherGroupDiscovery = apiDiscovery({ id: '3', groupId: '8' })
    mockDiscoveryResponse([
      personalDiscovery,
      groupDiscovery,
      otherGroupDiscovery,
    ])

    const result = await getGroupDiscoveries('token', '7')

    expect(result.map((discovery) => discovery.id)).toEqual([2])
  })
})

function mockDiscoveryResponse(body: unknown) {
  vi.spyOn(window, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function apiDiscovery(overrides: { id: string; groupId: string | null }) {
  return {
    id: overrides.id,
    userId: '42',
    groupId: overrides.groupId,
    title: `Discovery ${overrides.id}`,
    description: null,
    category: 'Other',
    longitude: 6.6,
    latitude: 46.7,
    imageObjectKey: `photos/${overrides.id}.jpg`,
    authorUserName: 'Explorer',
    countryCode: 'CHE',
    discoveredAt: '2026-08-28T12:00:00.000Z',
    createdAt: '2026-08-28T12:00:00.000Z',
    updatedAt: '2026-08-28T12:00:00.000Z',
  }
}
