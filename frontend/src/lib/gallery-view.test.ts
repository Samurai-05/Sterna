import { afterEach, describe, expect, it } from 'vitest'

import { loadGalleryView, saveGalleryView } from './gallery-view'

afterEach(() => window.localStorage.clear())

describe('Gallery view preference', () => {
  it('persists each user view independently', () => {
    saveGalleryView('1', 'grid')
    saveGalleryView('2', 'detailed')

    expect(loadGalleryView('1')).toBe('grid')
    expect(loadGalleryView('2')).toBe('detailed')
  })

  it('defaults to the detailed view', () => {
    expect(loadGalleryView('1')).toBe('detailed')
    expect(loadGalleryView(undefined)).toBe('detailed')
  })
})
