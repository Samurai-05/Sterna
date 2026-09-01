import { afterEach, describe, expect, it, vi } from 'vitest'

import { getPhoto } from '@/lib/api'
import {
  acquirePhotoUrl,
  clearPhotoUrlCache,
  releasePhotoUrl,
} from './photo-url-cache'

vi.mock('@/lib/api', () => ({ getPhoto: vi.fn() }))

afterEach(() => {
  clearPhotoUrlCache()
  vi.restoreAllMocks()
})

describe('photo URL cache', () => {
  it('shares one authenticated download between photo consumers', async () => {
    vi.mocked(getPhoto).mockResolvedValue(new Blob(['photo']))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo')

    const first = acquirePhotoUrl('token', 'discoveries/photo.jpg')
    const second = acquirePhotoUrl('token', 'discoveries/photo.jpg')

    await expect(first).resolves.toBe('blob:photo')
    await expect(second).resolves.toBe('blob:photo')
    expect(getPhoto).toHaveBeenCalledTimes(1)

    releasePhotoUrl('token', 'discoveries/photo.jpg')
    releasePhotoUrl('token', 'discoveries/photo.jpg')
  })
})
