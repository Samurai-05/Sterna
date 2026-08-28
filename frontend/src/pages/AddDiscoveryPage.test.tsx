import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { searchLocations, uploadPhoto } from '@/lib/api'
import { saveSession, clearSession } from '@/lib/session'
import { AddDiscoveryPage } from './AddDiscoveryPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    searchLocations: vi.fn(),
    uploadPhoto: vi.fn(),
  }
})

afterEach(() => {
  clearSession()
  vi.restoreAllMocks()
})

describe('AddDiscoveryPage', () => {
  it('renders a native photo selected before entering the form', () => {
    renderWithProviders(<AddDiscoveryPage />, {
      initialEntries: [
        {
          pathname: '/add',
          state: {
            selectedPhoto: {
              path: '/data/user/0/com.sterna.app/cache/photo.jpg',
              mimeType: 'image/jpeg',
              fileName: 'photo.jpg',
              source: 'gallery',
            },
          },
        },
      ],
    })

    expect(
      screen.getByRole('img', { name: 'Selected discovery photo' }),
    ).toHaveAttribute('src', expect.stringContaining('photo.jpg'))
    expect(screen.getByText('Photo selected')).toBeInTheDocument()
    expect(
      screen.queryByText('Choose a photo from your device'),
    ).not.toBeInTheDocument()
  })

  it('proposes the location found in a geotagged photo, once logged in', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    vi.mocked(uploadPhoto).mockResolvedValue({
      objectKey: 'photos/geotagged.jpg',
      url: '/api/photos/geotagged.jpg',
      exif: {
        latitude: 35.6586,
        longitude: 139.7454,
        takenAt: '2026-05-01T10:00:00.000Z',
      },
    })

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })

    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('Photo input not found.')
    const photo = new File(['fake-bytes'], 'tokyo-tower.jpg', {
      type: 'image/jpeg',
    })
    fireEvent.change(fileInput, { target: { files: [photo] } })

    expect(
      await screen.findByText(
        'Location detected from the photo. Tap or drag the pin to adjust it.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('35.65860, 139.74540')).toBeInTheDocument()
    expect(uploadPhoto).toHaveBeenCalledWith(
      'test-token',
      photo,
      'tokyo-tower.jpg',
    )
  })

  it('keeps manual placement available when a photo has no GPS metadata', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    vi.mocked(uploadPhoto).mockResolvedValue({
      objectKey: 'photos/no-gps.jpg',
      url: '/api/photos/no-gps.jpg',
      exif: null,
    })

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })

    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('Photo input not found.')
    const photo = new File(['fake-bytes'], 'no-gps.jpg', {
      type: 'image/jpeg',
    })
    fireEvent.change(fileInput, { target: { files: [photo] } })

    await screen.findByText('Photo selected')

    expect(
      screen.getByText(
        'Tap the map to drop a pin where this was discovered, or drag the pin to adjust it.',
      ),
    ).toBeInTheDocument()
  })

  it('moves the discovery location to a selected place search result', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    vi.mocked(searchLocations).mockResolvedValue([
      {
        id: 'relation:1688687',
        label: 'Lausanne, Vaud, Switzerland',
        type: 'city',
        longitude: 6.6327,
        latitude: 46.5218,
        zoom: 12,
      },
    ])

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Search for a location' }),
      { target: { value: 'Lausanne' } },
    )
    fireEvent.click(
      await screen.findByText(
        'Lausanne, Vaud, Switzerland',
        {},
        { timeout: 2000 },
      ),
    )

    expect(screen.getByText('46.52180, 6.63270')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Location selected from search. Tap or drag the pin to fine-tune it.',
      ),
    ).toBeInTheDocument()
  })
})
