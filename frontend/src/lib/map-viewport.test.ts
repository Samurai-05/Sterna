import { describe, expect, it, vi } from 'vitest'

import {
  defaultGlobeViewport,
  getGlobeFitPadding,
  getResponsiveGlobeMinimumZoom,
} from './map-viewport'

describe('responsive globe minimum zoom', () => {
  it('keeps the world-facing globe as the default viewport', () => {
    expect(defaultGlobeViewport).toEqual({ center: [0, 20], zoom: 1.5 })
  })

  it('calculates six percent of the smallest dimension with an eight pixel minimum', () => {
    expect(getGlobeFitPadding({ width: 320, height: 640 })).toBe(19)
    expect(getGlobeFitPadding({ width: 800, height: 400 })).toBe(24)
    expect(getGlobeFitPadding({ width: 0, height: 0 })).toBe(8)
  })

  it('fits the world bounds with the responsive padding', () => {
    const cameraForBounds = vi.fn().mockReturnValue({ zoom: 1.3 })
    const map = {
      getContainer: () => ({ clientWidth: 320, clientHeight: 640 }),
      cameraForBounds,
    }

    expect(getResponsiveGlobeMinimumZoom(map)).toBe(3.3)
    expect(cameraForBounds).toHaveBeenCalledWith(
      [
        [-180, -85.051129],
        [180, 85.051129],
      ],
      { padding: 19 },
    )
  })

  it('returns null when the map container has no usable dimensions', () => {
    const cameraForBounds = vi.fn()
    const map = {
      getContainer: () => ({ clientWidth: 0, clientHeight: 640 }),
      cameraForBounds,
    }

    expect(getResponsiveGlobeMinimumZoom(map)).toBeNull()
    expect(cameraForBounds).not.toHaveBeenCalled()
  })
})
