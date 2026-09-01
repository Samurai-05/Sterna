import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getPhoto } from '@/lib/api'
import { clearPhotoUrlCache } from '@/lib/photo-url-cache'
import { saveSession } from '@/lib/session'
import { DiscoveryPhoto } from './DiscoveryPhoto'

vi.mock('@/lib/api', () => ({ getPhoto: vi.fn() }))

const discovery = {
  id: 1,
  userId: '1',
  imageObjectKey: 'discoveries/real-photo.jpg',
  imageId: 'demo-photo',
  name: 'Real discovery',
  category: 'other' as const,
  location: 'France',
  description: '',
  author: 'Explorer',
  initials: 'E',
  relativeDate: 'now',
  coordinates: [2, 48] as [number, number],
  countryCode: 'FRA',
}

afterEach(() => {
  clearPhotoUrlCache()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('DiscoveryPhoto', () => {
  it('shows a neutral placeholder and shares the real photo download', async () => {
    let resolvePhoto!: (blob: Blob) => void
    vi.mocked(getPhoto).mockReturnValue(
      new Promise((resolve) => {
        resolvePhoto = resolve
      }),
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:real-photo')
    const user = {
      id: '1',
      email: 'a@b.c',
      userName: 'Explorer',
      createdAt: '2026-01-01T00:00:00.000Z',
      avatarObjectKey: null,
    }
    saveSession({
      accessToken: 'token',
      user,
    })

    render(
      <>
        <DiscoveryPhoto discovery={discovery} alt="First photo" />
        <DiscoveryPhoto discovery={discovery} alt="Second photo" />
      </>,
    )

    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('img[src*="images.unsplash.com"]')).toBeNull()

    resolvePhoto(new Blob(['real photo']))

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))
    expect(screen.getByRole('img', { name: 'First photo' })).toHaveAttribute(
      'src',
      'blob:real-photo',
    )
    expect(getPhoto).toHaveBeenCalledTimes(1)
  })
})
