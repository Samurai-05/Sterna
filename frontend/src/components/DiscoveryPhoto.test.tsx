import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getPhoto } from '@/lib/api'
import { saveSession } from '@/lib/session'
import { DiscoveryPhoto } from './DiscoveryPhoto'

vi.mock('@/lib/api', () => ({
  getPhoto: vi.fn(),
}))

const getPhotoMock = vi.mocked(getPhoto)
let observerCallback: IntersectionObserverCallback | undefined

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback
  }

  observe() {}

  disconnect() {}
}

const discovery = {
  id: 1,
  name: 'A discovery',
  category: 'landscape' as const,
  imageId: 'fallback',
  imageObjectKey: 'photos/example.jpg',
  description: '',
  author: 'Explorer',
  initials: 'E',
  location: '46.7000, 6.6000',
  relativeDate: 'today',
  countryCode: 'CHE',
  coordinates: [6.6, 46.7] as [number, number],
}

beforeEach(() => {
  saveSession({
    accessToken: 'token',
    user: {
      id: '1',
      email: 'explorer@example.test',
      userName: 'Explorer',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  })
  observerCallback = undefined
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: IntersectionObserverMock,
  })
  getPhotoMock.mockReset()
  getPhotoMock.mockResolvedValue(new Blob(['image']))
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('DiscoveryPhoto', () => {
  it('does not fetch until the image is near the viewport', async () => {
    render(<DiscoveryPhoto discovery={discovery} alt="A discovery" />)

    expect(getPhotoMock).not.toHaveBeenCalled()

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(getPhotoMock).toHaveBeenCalledWith(
      'token',
      'photos/example.jpg',
      'card',
    )
  })

  it('selects the requested detail variant', async () => {
    render(
      <DiscoveryPhoto
        discovery={discovery}
        alt="A discovery"
        variant="detail"
      />,
    )

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(getPhotoMock).toHaveBeenCalledWith(
      'token',
      'photos/example.jpg',
      'detail',
    )
  })

  it('renders a neutral placeholder instead of a stock photo while loading', async () => {
    getPhotoMock.mockReturnValue(new Promise(() => undefined))
    const { container } = render(
      <DiscoveryPhoto discovery={discovery} alt="A discovery" />,
    )

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(
      screen.getByRole('status', { name: 'Loading discovery photo' }),
    ).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('images.unsplash.com')
  })

  it('shows the authenticated photo after it loads', async () => {
    render(<DiscoveryPhoto discovery={discovery} alt="A discovery" />)

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(
      await screen.findByRole('img', { name: 'A discovery' }),
    ).toHaveAttribute('src', expect.stringContaining('blob:'))
  })

  it('shows a neutral unavailable state when the authenticated image fails', async () => {
    getPhotoMock.mockRejectedValueOnce(new Error('photo unavailable'))
    const { container } = render(
      <DiscoveryPhoto discovery={discovery} alt="A discovery" />,
    )

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(
      await screen.findByRole('img', { name: 'Photo unavailable' }),
    ).toBeInTheDocument()
    expect(container.innerHTML).not.toContain('images.unsplash.com')
  })

  it('revokes the owned object URL when the photo unmounts', async () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
    const { unmount } = render(
      <DiscoveryPhoto discovery={discovery} alt="A discovery" />,
    )

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: 'A discovery' }),
      ).toBeInTheDocument(),
    )

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith(
      expect.stringContaining('blob:'),
    )
  })

  it('revokes a response that resolves after the photo unmounts', async () => {
    const imagePrototype = globalThis.Image.prototype
    const originalDecode = Object.getOwnPropertyDescriptor(
      imagePrototype,
      'decode',
    )
    Object.defineProperty(imagePrototype, 'decode', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })

    let resolvePhoto!: (blob: Blob) => void
    try {
      getPhotoMock.mockReturnValue(
        new Promise((resolve) => {
          resolvePhoto = resolve
        }),
      )
      const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
      const { unmount } = render(
        <DiscoveryPhoto discovery={discovery} alt="A discovery" />,
      )

      await act(async () => {
        observerCallback?.(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
      unmount()

      resolvePhoto(new Blob(['late image']))
      await waitFor(() =>
        expect(revokeObjectURL).toHaveBeenCalledWith(
          expect.stringContaining('blob:'),
        ),
      )

      expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    } finally {
      if (originalDecode) {
        Object.defineProperty(imagePrototype, 'decode', originalDecode)
      } else {
        delete (imagePrototype as { decode?: unknown }).decode
      }
    }
  })
})
