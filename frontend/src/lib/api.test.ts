import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createDiscovery,
  getAllGroupDiscoveries,
  getAuthoredDiscoveries,
  getAuthoredPois,
  getDiscoveries,
  getGroupDiscoveries,
  getPhoto,
  clearPhotoCache,
  PHOTO_CACHE_TTL_MS,
  register,
  resolveApiUrl,
  updateDiscovery,
} from './api'

const personalDiscovery = apiDiscovery({ id: '1', groupId: null })
const groupDiscovery = apiDiscovery({ id: '2', groupId: '7' })

afterEach(() => {
  clearPhotoCache()
  vi.restoreAllMocks()
  vi.useRealTimers()
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

  it('accepts a personal discovery explicitly shared with the requested group', async () => {
    mockDiscoveryResponse([
      { ...personalDiscovery, groupIds: ['7'] },
      groupDiscovery,
    ])

    const result = await getGroupDiscoveries('token', '7')

    expect(result.map((discovery) => discovery.id)).toEqual([1, 2])
  })

  it('keeps every authored discovery in the collection response', async () => {
    const fetchMock = mockDiscoveryResponse([personalDiscovery, groupDiscovery])

    const result = await getAuthoredDiscoveries('token')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/discoveries/authored',
      expect.any(Object),
    )
    expect(result.map((discovery) => discovery.id)).toEqual([1, 2])
    expect(result[0].createdAt).toBe('2026-08-28T12:00:00.000Z')
  })

  it('loads discoveries from every group the user belongs to', async () => {
    const otherMemberDiscovery = {
      ...groupDiscovery,
      id: '3',
      userId: '99',
      authorUserName: 'Alex',
    }
    const fetchMock = mockDiscoveryResponse([
      groupDiscovery,
      otherMemberDiscovery,
    ])

    const result = await getAllGroupDiscoveries('token')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/discoveries/groups',
      expect.any(Object),
    )
    expect(result.map((discovery) => discovery.id)).toEqual([2, 3])
    expect(result[1].author).toBe('Alex')
  })
})

describe('profile boundaries', () => {
  it('loads POI progress based on every discovery authored by the user', async () => {
    const fetchMock = mockDiscoveryResponse([
      {
        id: '1',
        title: 'Eiffel Tower',
        description: null,
        longitude: 2.2945,
        latitude: 48.8584,
        countryCode: 'FRA',
        imageUrl: null,
        discovered: true,
      },
    ])

    const result = await getAuthoredPois('token')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/pois/authored',
      expect.any(Object),
    )
    expect(result[0]).toMatchObject({
      name: 'Eiffel Tower',
      country: 'France',
      discovered: true,
    })
  })
})

describe('API URL resolution', () => {
  it('keeps web requests relative when no API base URL is configured', () => {
    expect(resolveApiUrl('/api/auth/register', '')).toBe('/api/auth/register')
  })

  it('uses the Android API base URL when one is configured', () => {
    expect(
      resolveApiUrl('/api/auth/register', 'https://labo-iot1.iict-heig-vd.ch/'),
    ).toBe('https://labo-iot1.iict-heig-vd.ch/api/auth/register')
  })
})

describe('API response errors', () => {
  it('reports a successful HTML fallback with its HTTP status instead of throwing a JSON parse error', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response('<!doctype html><html><body>Not found</body></html>', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html' },
      }),
    )

    await expect(
      register({
        email: 'ada@sterna.test',
        password: 'correct horse battery staple',
        userName: 'Ada',
      }),
    ).rejects.toMatchObject({
      status: 200,
      message: expect.stringContaining('HTML instead of JSON'),
    })
  })
})

describe('authenticated photo variants', () => {
  it('requests a variant and deduplicates concurrent consumers', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('image', {
        status: 200,
        headers: { 'Content-Type': 'image/webp' },
      }),
    )

    const first = getPhoto('token', 'photos/deduped.jpg', 'map')
    const second = getPhoto('token', 'photos/deduped.jpg', 'map')

    const [firstBlob, secondBlob] = await Promise.all([first, second])
    expect(firstBlob).toBe(secondBlob)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/photos/deduped.jpg?variant=map',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })

  it('reuses a resolved photo within the cache TTL', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response('image', { status: 200 }),
    )

    await getPhoto('token', 'photos/reused.jpg', 'card')
    await getPhoto('token', 'photos/reused.jpg', 'card')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetches again after the resolved photo cache expires', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response('image', { status: 200 })),
    )

    await getPhoto('token', 'photos/expired.jpg', 'card')
    vi.advanceTimersByTime(PHOTO_CACHE_TTL_MS)
    await getPhoto('token', 'photos/expired.jpg', 'card')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps map, card, and detail variants in separate cache entries', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response('image', { status: 200 })),
    )

    await Promise.all([
      getPhoto('token', 'photos/variants.jpg', 'map'),
      getPhoto('token', 'photos/variants.jpg', 'card'),
      getPhoto('token', 'photos/variants.jpg', 'detail'),
    ])
    await Promise.all([
      getPhoto('token', 'photos/variants.jpg', 'map'),
      getPhoto('token', 'photos/variants.jpg', 'card'),
      getPhoto('token', 'photos/variants.jpg', 'detail'),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('keeps different access tokens in separate cache entries', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response('image', { status: 200 })),
    )

    await getPhoto('token-a', 'photos/token-isolation.jpg', 'card')
    await getPhoto('token-b', 'photos/token-isolation.jpg', 'card')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('evicts failed requests so a later request retries', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(new Response('image', { status: 200 }))

    await expect(
      getPhoto('token', 'photos/retry.jpg', 'card'),
    ).rejects.toThrow('network unavailable')
    const result = await getPhoto('token', 'photos/retry.jpg', 'card')
    expect(result.size).toBeGreaterThan(0)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('discovery group sharing', () => {
  it('sends every selected group when creating a discovery', async () => {
    const fetchMock = mockDiscoveryResponse(personalDiscovery)

    await createDiscovery({
      accessToken: 'token',
      groupId: null,
      groupIds: ['7', '8'],
      personal: true,
      title: 'Shared discovery',
      description: null,
      category: 'other',
      longitude: 6.6,
      latitude: 46.7,
      imageObjectKey: 'photos/shared.jpg',
      locationSource: 'manual',
      discoveredAt: '2026-08-28T12:00:00.000Z',
    })

    expect(requestBody(fetchMock)).toMatchObject({
      groupIds: ['7', '8'],
      personal: true,
      locationSource: 'manual',
    })
  })

  it('sends the updated group selection when editing a discovery', async () => {
    const fetchMock = mockDiscoveryResponse(personalDiscovery)

    await updateDiscovery({
      accessToken: 'token',
      discoveryId: '1',
      groupIds: ['8'],
      personal: false,
      title: 'Updated discovery',
      description: null,
      category: 'other',
      longitude: 6.6,
      latitude: 46.7,
    })

    expect(requestBody(fetchMock)).toMatchObject({
      groupIds: ['8'],
      personal: false,
    })
  })
})

function mockDiscoveryResponse(body: unknown) {
  return vi.spyOn(window, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function requestBody(fetchMock: ReturnType<typeof vi.spyOn>) {
  const request = fetchMock.mock.calls[0][1] as RequestInit
  return JSON.parse(request.body as string) as Record<string, unknown>
}

function apiDiscovery(overrides: { id: string; groupId: string | null }) {
  return {
    id: overrides.id,
    userId: '42',
    groupId: overrides.groupId,
    groupIds: overrides.groupId ? [overrides.groupId] : [],
    personal: overrides.groupId === null,
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
