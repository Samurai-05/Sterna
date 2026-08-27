import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { saveSession } from '@/lib/session'
import { AddDiscoveryPage } from './AddDiscoveryPage'

const { createDiscoveryMock, uploadPhotoMock } = vi.hoisted(() => ({
  createDiscoveryMock: vi.fn(),
  uploadPhotoMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  createDiscovery: createDiscoveryMock,
  uploadPhoto: uploadPhotoMock,
}))

vi.mock('@/components/LocationPickerMap', () => ({
  LocationPickerMap: ({
    coordinates,
    onChange,
  }: {
    coordinates: [number, number]
    onChange: (coordinates: [number, number]) => void
  }) => (
    <div>
      <output>
        {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
      </output>
      <button
        type="button"
        aria-label="Choose another location"
        onClick={() => onChange([7.1, 47.1])}
      />
    </div>
  ),
}))

const photoUpload = {
  objectKey: 'photos/photo.jpg',
  url: '/api/photos/photo.jpg',
  exif: null as {
    latitude: number
    longitude: number
    takenAt: string | null
  } | null,
}

function renderAuthenticatedAddPage() {
  saveSession({
    accessToken: 'test-token',
    user: {
      id: '1',
      email: 'explorer@sterna.app',
      userName: 'Explorer',
      createdAt: '2026-08-26T08:00:00.000Z',
    },
  })

  return renderWithProviders(<AddDiscoveryPage />)
}

function selectBrowserPhoto(name = 'photo.jpg') {
  const photo = new File(['photo'], name, { type: 'image/jpeg' })
  fireEvent.change(document.querySelector('input[type="file"]')!, {
    target: { files: [photo] },
  })
}

afterEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
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

  it('proposes the EXIF GPS coordinates before the discovery is saved', async () => {
    uploadPhotoMock.mockResolvedValue({
      ...photoUpload,
      exif: {
        latitude: 46.948,
        longitude: 7.4474,
        takenAt: '2026-08-20T14:02:11.000Z',
      },
    })
    renderAuthenticatedAddPage()

    selectBrowserPhoto()

    await waitFor(() => {
      expect(screen.getAllByText('46.94800, 7.44740')).not.toHaveLength(0)
    })
  })

  it('preserves a manual location change when saving after an EXIF proposal', async () => {
    uploadPhotoMock.mockResolvedValue({
      ...photoUpload,
      exif: {
        latitude: 46.948,
        longitude: 7.4474,
        takenAt: null,
      },
    })
    createDiscoveryMock.mockResolvedValue({ id: 42 })
    renderAuthenticatedAddPage()

    selectBrowserPhoto()
    await waitFor(() => {
      expect(screen.getAllByText('46.94800, 7.44740')).not.toHaveLength(0)
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Choose another location' }),
    )
    fireEvent.change(screen.getByPlaceholderText('Name your discovery'), {
      target: { value: 'A manual location' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save discovery' }))

    await waitFor(() => expect(createDiscoveryMock).toHaveBeenCalledOnce())
    expect(createDiscoveryMock).toHaveBeenCalledWith(
      expect.objectContaining({ longitude: 7.1, latitude: 47.1 }),
    )
  })

  it('still creates a discovery when the photo has no EXIF GPS coordinates', async () => {
    uploadPhotoMock.mockResolvedValue(photoUpload)
    createDiscoveryMock.mockResolvedValue({ id: 42 })
    renderAuthenticatedAddPage()

    selectBrowserPhoto()
    await waitFor(() => expect(uploadPhotoMock).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByPlaceholderText('Name your discovery'), {
      target: { value: 'No GPS photo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save discovery' }))

    await waitFor(() => expect(createDiscoveryMock).toHaveBeenCalledOnce())
    expect(createDiscoveryMock).toHaveBeenCalledWith(
      expect.objectContaining({ longitude: 2.3522, latitude: 48.8566 }),
    )
  })

  it('does not replace a manual location when a replacement photo has EXIF GPS', async () => {
    uploadPhotoMock
      .mockResolvedValueOnce({
        ...photoUpload,
        exif: {
          latitude: 46.948,
          longitude: 7.4474,
          takenAt: null,
        },
      })
      .mockResolvedValueOnce({
        ...photoUpload,
        exif: {
          latitude: 48.8566,
          longitude: 2.3522,
          takenAt: null,
        },
      })
    renderAuthenticatedAddPage()

    selectBrowserPhoto('first.jpg')
    await waitFor(() => {
      expect(screen.getAllByText('46.94800, 7.44740')).not.toHaveLength(0)
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Choose another location' }),
    )
    selectBrowserPhoto('replacement.jpg')

    await waitFor(() => expect(uploadPhotoMock).toHaveBeenCalledTimes(2))
    expect(screen.getAllByText('47.10000, 7.10000')).not.toHaveLength(0)
  })
})
