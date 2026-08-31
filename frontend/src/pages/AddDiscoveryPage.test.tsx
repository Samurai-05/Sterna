import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import {
  createDiscovery,
  searchLocations,
  uploadPhoto,
  type UploadPhotoResponse,
} from '@/lib/api'
import { saveSession, clearSession } from '@/lib/session'
import { AddDiscoveryPage } from './AddDiscoveryPage'

const originalGeolocation = window.navigator.geolocation

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    createDiscovery: vi.fn(),
    searchLocations: vi.fn(),
    uploadPhoto: vi.fn(),
  }
})

afterEach(() => {
  clearSession()
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: originalGeolocation,
  })
  vi.restoreAllMocks()
})

describe('AddDiscoveryPage', () => {
  it('uses the current device position as the initial discovery location', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { longitude: 7.4474, latitude: 46.948 } }),
        ),
      },
    })

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })

    expect(await screen.findByText('46.94800, 7.44740')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Current location detected. Tap or drag the pin to adjust it.',
      ),
    ).toBeInTheDocument()
  })

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
        'No real location selected yet. Tap the map to drop a pin, or search for a place before saving.',
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

  it('blocks saving when only the map fallback is available', async () => {
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
      objectKey: 'photos/no-location.jpg',
      url: '/api/photos/no-location.jpg',
      metadata: { location: null, takenAt: null },
    })

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })
    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('Photo input not found.')
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['bytes'], 'no-location.jpg', { type: 'image/jpeg' })],
      },
    })
    await screen.findByText('Photo selected')
    fireEvent.submit(document.querySelector('form')!)

    expect(
      await screen.findByText(
        'Choose a real discovery location on the map or search for a place before saving.',
      ),
    ).toBeInTheDocument()
    expect(createDiscovery).not.toHaveBeenCalled()
  })

  it('ignores upload metadata that belongs to a replaced photo', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    const resolvers = new Map<string, (value: UploadPhotoResponse) => void>()
    vi.mocked(uploadPhoto).mockImplementation(
      async (_token, _photo, fileName) => {
        return new Promise((resolve) => resolvers.set(fileName, resolve))
      },
    )

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })
    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('Photo input not found.')
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['a'], 'photo-a.jpg', { type: 'image/jpeg' })],
      },
    })
    await waitFor(() => expect(resolvers.has('photo-a.jpg')).toBe(true))
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['b'], 'photo-b.jpg', { type: 'image/jpeg' })],
      },
    })
    await waitFor(() => expect(resolvers.has('photo-b.jpg')).toBe(true))

    resolvers.get('photo-a.jpg')?.({
      objectKey: 'photos/a.jpg',
      url: '/api/photos/a.jpg',
      metadata: {
        location: { latitude: 35.6586, longitude: 139.7454 },
        takenAt: '2026-05-01T10:00:00.000Z',
      },
    })
    expect(screen.queryByText('35.65860, 139.74540')).not.toBeInTheDocument()
  })
})
