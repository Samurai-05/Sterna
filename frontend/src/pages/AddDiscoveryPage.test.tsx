import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'

import { renderWithProviders } from '@/test/renderWithProviders'
import {
  createDiscovery,
  searchLocations,
  uploadPhoto,
  type UploadPhotoResponse,
} from '@/lib/api'
import { saveSession, clearSession } from '@/lib/session'
import { releaseNativePhoto } from '@/lib/photo-capture'
import {
  AddDiscoveryPage,
  getPhotoUploadErrorMessage,
  readSelectedPhoto,
} from './AddDiscoveryPage'

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

vi.mock('@/lib/photo-capture', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/photo-capture')>()
  return {
    ...actual,
    releaseNativePhoto: vi.fn(),
  }
})

afterEach(() => {
  clearSession()
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: originalGeolocation,
  })
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AddDiscoveryPage', () => {
  it('uses the native MIME type when the Capacitor Blob has no MIME', async () => {
    const convertFileSrc = vi
      .spyOn(Capacitor, 'convertFileSrc')
      .mockReturnValue('https://localhost/_capacitor_file/photo.jpg')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => (name === 'content-length' ? '10' : null),
      },
      blob: vi.fn().mockResolvedValue(new Blob(['jpeg-bytes'], { type: '' })),
    })
    vi.stubGlobal('fetch', fetchMock)
    const nativePhoto = {
      path: '/data/user/0/com.sterna.app/cache/photo.jpg',
      mimeType: 'image/jpeg',
      fileName: 'photo.jpg',
      source: 'camera' as const,
    }

    const result = await readSelectedPhoto(nativePhoto, null)

    expect(convertFileSrc).toHaveBeenCalledWith(nativePhoto.path)
    expect(result.photo.type).toBe('image/jpeg')
    expect(result.photo.size).toBe(10)
  })

  it('replaces a generic native Blob MIME with the plugin MIME type', async () => {
    vi.spyOn(Capacitor, 'convertFileSrc').mockReturnValue(
      'https://localhost/_capacitor_file/photo.jpg',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        blob: vi
          .fn()
          .mockResolvedValue(
            new Blob(['jpeg-bytes'], { type: 'application/octet-stream' }),
          ),
      }),
    )

    const result = await readSelectedPhoto(
      {
        path: '/data/user/0/com.sterna.app/cache/photo.jpg',
        mimeType: 'image/jpeg',
        fileName: 'photo.jpg',
        source: 'camera',
      },
      null,
    )

    expect(result.photo.type).toBe('image/jpeg')
    expect(result.photo.size).toBe(10)
  })

  it('rejects an empty native Blob', async () => {
    vi.spyOn(Capacitor, 'convertFileSrc').mockReturnValue(
      'https://localhost/_capacitor_file/photo.jpg',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: vi.fn().mockResolvedValue(new Blob([], { type: 'image/jpeg' })),
      }),
    )

    await expect(
      readSelectedPhoto(
        {
          path: '/data/user/0/com.sterna.app/cache/photo.jpg',
          mimeType: 'image/jpeg',
          fileName: 'photo.jpg',
          source: 'camera',
        },
        null,
      ),
    ).rejects.toThrow('Unable to read captured photo.')
  })

  it('rejects a native photo larger than 10 MiB', async () => {
    vi.spyOn(Capacitor, 'convertFileSrc').mockReturnValue(
      'https://localhost/_capacitor_file/photo.jpg',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: vi.fn().mockResolvedValue(
          new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], {
            type: 'image/jpeg',
          }),
        ),
      }),
    )

    await expect(
      readSelectedPhoto(
        {
          path: '/data/user/0/com.sterna.app/cache/photo.jpg',
          mimeType: 'image/jpeg',
          fileName: 'photo.jpg',
          source: 'camera',
        },
        null,
      ),
    ).rejects.toThrow('Photo is too large.')
  })

  it('rejects a browser photo larger than 10 MiB', async () => {
    const photo = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'large.jpg',
      {
        type: 'image/jpeg',
      },
    )

    await expect(readSelectedPhoto(undefined, photo)).rejects.toThrow(
      'Photo is too large.',
    )
  })

  it('maps upload status errors to safe user messages', () => {
    expect(getPhotoUploadErrorMessage({ status: 413 })).toBe(
      'Photo is too large.',
    )
    expect(getPhotoUploadErrorMessage({ status: 415 })).toBe(
      'Unsupported image type.',
    )
  })

  it('reports a native file bridge failure as a readable photo error', async () => {
    vi.spyOn(Capacitor, 'convertFileSrc').mockReturnValue(
      'https://localhost/_capacitor_file/photo.jpg',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('file bridge unavailable')),
    )

    await expect(
      readSelectedPhoto(
        {
          path: '/data/user/0/com.sterna.app/cache/photo.jpg',
          mimeType: 'image/jpeg',
          fileName: 'photo.jpg',
          source: 'camera',
        },
        null,
      ),
    ).rejects.toThrow('Unable to read captured photo.')
  })

  it('passes a browser gallery JPEG through unchanged', async () => {
    const photo = new File(['jpeg-bytes'], 'gallery.jpg', {
      type: 'image/jpeg',
    })

    const result = await readSelectedPhoto(undefined, photo)

    expect(result).toEqual({ photo, fileName: 'gallery.jpg' })
  })

  it('uses the current device position as the initial discovery location', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        avatarObjectKey: null,
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
        avatarObjectKey: null,
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
        avatarObjectKey: null,
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
        avatarObjectKey: null,
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
        avatarObjectKey: null,
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
        avatarObjectKey: null,
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

  it('shows the upload cause instead of asking for the same photo again', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        avatarObjectKey: null,
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    vi.mocked(uploadPhoto)
      .mockRejectedValueOnce(
        Object.assign(new Error('File too large'), { status: 413 }),
      )
      .mockResolvedValueOnce({
        objectKey: 'photos/retried.jpg',
        url: '/api/photos/retried.jpg',
        metadata: { location: null, takenAt: null },
      })

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })
    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('Photo input not found.')
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['bytes'], 'large.jpg', { type: 'image/jpeg' })],
      },
    })
    await waitFor(() => expect(uploadPhoto).toHaveBeenCalled())
    expect(uploadPhoto).toHaveBeenCalledTimes(1)

    fireEvent.submit(document.querySelector('form')!)

    expect(await screen.findAllByText('Photo is too large.')).toHaveLength(2)
    expect(
      screen.queryByText(
        'The photo failed to upload. Choose it again to retry.',
      ),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry photo upload' }))
    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Photo is too large.')).not.toBeInTheDocument()
  })

  it('does not let an earlier upload error replace the current photo state', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        avatarObjectKey: null,
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    const deferred = new Map<
      string,
      {
        resolve: (value: UploadPhotoResponse) => void
        reject: (error: Error) => void
      }
    >()
    vi.mocked(uploadPhoto).mockImplementation(
      async (_token, _photo, fileName) =>
        new Promise((resolve, reject) => {
          deferred.set(fileName, { resolve, reject })
        }),
    )

    renderWithProviders(<AddDiscoveryPage />, { route: '/add' })
    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('Photo input not found.')
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['a'], 'photo-a.jpg', { type: 'image/jpeg' })],
      },
    })
    await waitFor(() => expect(deferred.has('photo-a.jpg')).toBe(true))
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['b'], 'photo-b.jpg', { type: 'image/jpeg' })],
      },
    })
    await waitFor(() => expect(deferred.has('photo-b.jpg')).toBe(true))

    deferred.get('photo-a.jpg')?.reject(new Error('old upload failed'))
    deferred.get('photo-b.jpg')?.resolve({
      objectKey: 'photos/b.jpg',
      url: '/api/photos/b.jpg',
      metadata: { location: null, takenAt: null },
    })

    await waitFor(() =>
      expect(screen.getByText('Photo selected')).toBeInTheDocument(),
    )
    fireEvent.submit(document.querySelector('form')!)
    expect(
      await screen.findByText(
        'Choose a real discovery location on the map or search for a place before saving.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Upload failed. Please try again.'),
    ).not.toBeInTheDocument()
  })

  it('cleans a completed native upload when a gallery photo replaces it', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        avatarObjectKey: null,
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    vi.spyOn(Capacitor, 'convertFileSrc').mockReturnValue(
      'https://localhost/_capacitor_file/camera.jpg',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: vi
          .fn()
          .mockResolvedValue(new Blob(['camera'], { type: 'image/jpeg' })),
      }),
    )
    vi.mocked(uploadPhoto).mockResolvedValue({
      objectKey: 'photos/camera.jpg',
      url: '/api/photos/camera.jpg',
      metadata: { location: null, takenAt: null },
    })

    const cameraPhoto = {
      path: '/data/user/0/com.sterna.app/cache/sterna-camera-a.jpg',
      mimeType: 'image/jpeg',
      fileName: 'sterna-camera-a.jpg',
      source: 'camera' as const,
    }
    renderWithProviders(<AddDiscoveryPage />, {
      initialEntries: [
        { pathname: '/add', state: { selectedPhoto: cameraPhoto } },
      ],
    })
    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledOnce())

    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('Photo input not found.')
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['gallery'], 'gallery.jpg', { type: 'image/jpeg' })],
      },
    })

    await waitFor(() =>
      expect(releaseNativePhoto).toHaveBeenCalledWith(cameraPhoto.path),
    )
  })

  it('keeps a native file until its old upload settles after replacement', async () => {
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        avatarObjectKey: null,
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    vi.spyOn(Capacitor, 'convertFileSrc').mockReturnValue(
      'https://localhost/_capacitor_file/camera.jpg',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: vi
          .fn()
          .mockResolvedValue(new Blob(['camera'], { type: 'image/jpeg' })),
      }),
    )
    let rejectUpload!: (error: Error) => void
    vi.mocked(uploadPhoto).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectUpload = reject
        }),
    )
    const cameraPhoto = {
      path: '/data/user/0/com.sterna.app/cache/sterna-camera-pending.jpg',
      mimeType: 'image/jpeg',
      fileName: 'sterna-camera-pending.jpg',
      source: 'camera' as const,
    }
    renderWithProviders(<AddDiscoveryPage />, {
      initialEntries: [
        { pathname: '/add', state: { selectedPhoto: cameraPhoto } },
      ],
    })
    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledOnce())

    const fileInput = document.querySelector('input[type="file"]')
    if (!fileInput) throw new Error('Photo input not found.')
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['gallery'], 'gallery.jpg', { type: 'image/jpeg' })],
      },
    })
    expect(releaseNativePhoto).not.toHaveBeenCalled()

    rejectUpload(new Error('old upload failed'))
    await waitFor(() =>
      expect(releaseNativePhoto).toHaveBeenCalledWith(cameraPhoto.path),
    )
  })
})
