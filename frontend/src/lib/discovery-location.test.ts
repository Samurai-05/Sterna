import { describe, expect, it } from 'vitest'

import {
  canApplyAutomaticLocation,
  normalizeLocationSource,
} from './discovery-location'

describe('discovery location rules', () => {
  it('does not let automatic results replace a manual selection', () => {
    expect(canApplyAutomaticLocation({ source: 'manual' }, 'exif')).toBe(false)
    expect(canApplyAutomaticLocation({ source: 'manual' }, 'current_gps')).toBe(
      false,
    )
  })

  it('lets EXIF replace a lower-priority current GPS proposal', () => {
    expect(canApplyAutomaticLocation({ source: 'current_gps' }, 'exif')).toBe(
      true,
    )
    expect(canApplyAutomaticLocation({ source: 'exif' }, 'current_gps')).toBe(
      false,
    )
  })

  it('normalizes photo and search UI sources for persistence', () => {
    expect(normalizeLocationSource('photo')).toBe('exif')
    expect(normalizeLocationSource('search')).toBe('manual')
    expect(normalizeLocationSource('current')).toBe('current_gps')
  })
})
