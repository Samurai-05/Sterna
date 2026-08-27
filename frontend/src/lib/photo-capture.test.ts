import { describe, expect, it, vi } from 'vitest'

import {
  createDiscoveryPhotoAction,
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

  it('returns to the originating screen when native capture is cancelled by back', async () => {
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

  it('keeps the originating root tab when opening the discovery form', async () => {
    const navigate = vi.fn()

    await createDiscoveryPhotoAction({
      platform: 'web',
      navigate,
      returnTo: '/collection',
    })

    expect(navigate).toHaveBeenCalledWith('/add', {
      state: { returnTo: '/collection' },
    })
  })
})
