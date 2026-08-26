import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDiscovery } from './api'

describe('createDiscovery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps category unset when the user did not choose one', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: '1',
            userId: 'user-1',
            groupId: null,
            title: 'Untitled discovery',
            description: null,
            category: null,
            longitude: 2.3522,
            latitude: 48.8566,
            imageObjectKey: 'discoveries/photo.jpg',
            discoveredAt: '2026-08-26T12:00:00.000Z',
            createdAt: '2026-08-26T12:00:00.000Z',
            updatedAt: '2026-08-26T12:00:00.000Z',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ features: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    await createDiscovery({
      accessToken: 'token',
      title: 'Untitled discovery',
      description: null,
      category: null,
      longitude: 2.3522,
      latitude: 48.8566,
      imageObjectKey: 'discoveries/photo.jpg',
      discoveredAt: '2026-08-26T12:00:00.000Z',
    })

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(requestInit.body as string)).toMatchObject({
      category: null,
    })
  })
})
