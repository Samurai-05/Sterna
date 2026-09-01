import { describe, expect, it, vi } from 'vitest'

import {
  createDiscoveryPhotoAction,
  releaseNativePhoto,
  type SelectedPhoto,
} from './photo-capture'

const selectedPhoto: SelectedPhoto = {
  path: '/data/user/0/com.sterna.app/cache/sterna-photo.jpg',
  mimeType: 'image/jpeg',
  fileName: 'sterna-photo.jpg',
  source: 'camera',
}

describe('createDiscoveryPhotoAction', () => {
  it('opens native capture on Android and navigates only after selection', async () => {
    const navigate = vi.fn()
    const open = vi.fn().mockResolvedValue(selectedPhoto)

    await createDiscoveryPhotoAction({
      platform: 'android',
      open,
      navigate,
    })

    expect(open).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/add', {
      state: { selectedPhoto },
    })
  })

  it('does not navigate when native capture is cancelled', async () => {
    const navigate = vi.fn()
    const open = vi.fn().mockResolvedValue(null)

    await createDiscoveryPhotoAction({
      platform: 'android',
      open,
      navigate,
    })

    expect(navigate).not.toHaveBeenCalled()
  })

  it('keeps the browser fallback by navigating directly to the form', async () => {
    const navigate = vi.fn()
    const open = vi.fn()

    await createDiscoveryPhotoAction({
      platform: 'web',
      open,
      navigate,
    })

    expect(open).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/add')
  })
})

describe('releaseNativePhoto', () => {
  it('asks the native plugin to delete a selected cache file', async () => {
    const release = vi.fn().mockResolvedValue(undefined)

    await releaseNativePhoto(selectedPhoto.path, release)

    expect(release).toHaveBeenCalledWith(selectedPhoto.path)
  })
})
