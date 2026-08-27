import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { uploadPhoto } from '@/lib/api'
import { saveSession, clearSession } from '@/lib/session'
import { AddDiscoveryPage } from './AddDiscoveryPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getActiveMap: vi.fn(),
    getGroups: vi.fn(),
    setActiveMap: vi.fn(),
    uploadPhoto: vi.fn(),
  }
})

const api = vi.mocked(await import('@/lib/api'))

beforeEach(() => {
  api.getActiveMap.mockResolvedValue({ groupId: null, name: null })
  api.getGroups.mockResolvedValue([])
})

afterEach(() => {
  clearSession()
  vi.restoreAllMocks()
})

describe('AddDiscoveryPage', () => {
  it('keeps the photo prompt primary before a photo is selected', () => {
    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })

    expect(
      screen.getByText('Choose a photo from your device'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('JPEG, PNG or WebP · 10 MB maximum'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Take a photo' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Change photo' }),
    ).not.toBeInTheDocument()
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
    expect(
      screen.getByRole('button', { name: 'Change photo' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retake' })).toBeInTheDocument()
    expect(screen.queryByText('Photo selected')).not.toBeInTheDocument()
    expect(
      screen.queryByText('JPEG, PNG or WebP · 10 MB maximum'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Take a photo' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Choose a photo from your device'),
    ).not.toBeInTheDocument()
  })

  it('offers gallery and camera actions after a photo is selected', async () => {
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
      objectKey: 'photos/selected.jpg',
      url: '/api/photos/selected.jpg',
      exif: null,
    })

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })

    const inputs = document.querySelectorAll('input[type="file"]')
    expect(inputs).toHaveLength(2)
    fireEvent.change(inputs[0], {
      target: {
        files: [new File(['gallery'], 'gallery.jpg', { type: 'image/jpeg' })],
      },
    })

    expect(
      await screen.findByRole('button', { name: 'Change photo' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Change photo' }))
    fireEvent.change(inputs[0], {
      target: {
        files: [
          new File(['replacement'], 'replacement.jpg', {
            type: 'image/jpeg',
          }),
        ],
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Retake' }))
    fireEvent.change(inputs[1], {
      target: {
        files: [new File(['camera'], 'camera.jpg', { type: 'image/jpeg' })],
      },
    })

    await waitFor(() =>
      expect(uploadPhoto).toHaveBeenLastCalledWith(
        'test-token',
        expect.objectContaining({ name: 'camera.jpg' }),
        'camera.jpg',
      ),
    )
  })

  it('changes the active destination from the compact row', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    api.getGroups.mockResolvedValue([
      {
        id: '12',
        name: 'Weekend Paris',
        description: null,
        role: 'member',
        isActive: false,
        memberCount: 2,
        discoveryCount: 1,
      },
    ])
    api.setActiveMap.mockResolvedValue({ groupId: '12', name: 'Weekend Paris' })

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })

    expect(await screen.findByText('Personal map')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    fireEvent.click(screen.getByRole('button', { name: /Weekend Paris/ }))

    await waitFor(() =>
      expect(api.setActiveMap).toHaveBeenCalledWith({
        accessToken: 'test-token',
        groupId: '12',
      }),
    )
    expect(await screen.findByText('Weekend Paris')).toBeInTheDocument()
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

    await screen.findByRole('button', { name: 'Change photo' })

    expect(
      screen.getByText(
        'Tap the map to drop a pin where this was discovered, or drag the pin to adjust it.',
      ),
    ).toBeInTheDocument()
  })
})
