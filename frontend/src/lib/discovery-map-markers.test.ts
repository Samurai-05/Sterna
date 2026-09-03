import { describe, expect, it } from 'vitest'

import {
  DISCOVERY_BADGE_FULL_ZOOM,
  DISCOVERY_DOT_END_ZOOM,
  DISCOVERY_MARKER_FULL_ZOOM,
  DISCOVERY_PHOTO_FULL_ZOOM,
  DISCOVERY_PHOTO_MORPH_START_ZOOM,
  getDiscoveryMapColor,
  getDiscoveryMarkerVisual,
  toDiscoveryFeatureCollection,
} from './discovery-map-markers'

describe('getDiscoveryMarkerVisual', () => {
  it('keeps the HTML marker hidden at world zoom', () => {
    expect(getDiscoveryMarkerVisual(3.3).domOpacity).toBe(0)
  })

  it('begins the DOM marker transition at zoom 4.2', () => {
    const visual = getDiscoveryMarkerVisual(DISCOVERY_DOT_END_ZOOM)

    expect(visual.domOpacity).toBe(0)
    expect(visual.size).toBeCloseTo(8)
    expect(visual.iconOpacity).toBe(0)
  })

  it('reaches the full category badge at zoom 5.2', () => {
    const visual = getDiscoveryMarkerVisual(DISCOVERY_BADGE_FULL_ZOOM)

    expect(visual.size).toBeCloseTo(26)
    expect(visual.iconOpacity).toBe(1)
    expect(visual.photoOpacity).toBe(0)
  })

  it('reaches the stable category marker at zoom 7', () => {
    expect(
      getDiscoveryMarkerVisual(DISCOVERY_MARKER_FULL_ZOOM).size,
    ).toBeCloseTo(34)
  })

  it('starts the photo morph from the stable category marker', () => {
    const visual = getDiscoveryMarkerVisual(DISCOVERY_PHOTO_MORPH_START_ZOOM)

    expect(visual.size).toBeCloseTo(34)
    expect(visual.iconOpacity).toBe(1)
    expect(visual.photoOpacity).toBe(0)
  })

  it('finishes as a photo thumbnail at zoom 12.8', () => {
    const visual = getDiscoveryMarkerVisual(DISCOVERY_PHOTO_FULL_ZOOM)

    expect(visual.size).toBeCloseTo(56)
    expect(visual.iconOpacity).toBe(0)
    expect(visual.photoOpacity).toBe(1)
    expect(visual.borderRadius).toBeCloseTo(12)
  })

  it('crossfades icon and photo halfway through the photo morph', () => {
    const visual = getDiscoveryMarkerVisual(12.15)

    expect(visual.size).toBeCloseTo(45)
    expect(visual.iconOpacity).toBeCloseTo(0.5)
    expect(visual.photoOpacity).toBeCloseTo(0.5)
    expect(visual.borderRadius).toBeCloseTo(14.5)
  })

  it('keeps category fallback geometry at 56px when photo is not ready at high zoom', () => {
    const notReady = getDiscoveryMarkerVisual(DISCOVERY_PHOTO_FULL_ZOOM, false)
    const ready = getDiscoveryMarkerVisual(DISCOVERY_PHOTO_FULL_ZOOM, true)

    // Geometry is identical
    expect(notReady.size).toBeCloseTo(56)
    expect(notReady.borderRadius).toBeCloseTo(12)
    expect(notReady.borderWidth).toBeCloseTo(2)
    expect(ready.size).toBeCloseTo(56)
    expect(ready.borderRadius).toBeCloseTo(12)
    expect(ready.borderWidth).toBeCloseTo(2)

    // Visual state differs: not ready keeps icon and color visible with 0 photoOpacity
    expect(notReady.photoOpacity).toBe(0)
    expect(notReady.colorOpacity).toBe(1)
    expect(notReady.iconOpacity).toBe(1)

    // Ready displays photo
    expect(ready.photoOpacity).toBe(1)
    expect(ready.colorOpacity).toBe(0)
    expect(ready.iconOpacity).toBe(0)
  })
})

describe('Discovery map colors', () => {
  it.each([
    ['landscape', '#2563EB'],
    ['monument', '#BE123C'],
    ['food', '#EA580C'],
    ['animal', '#0891B2'],
    ['plant', '#16A34A'],
    ['culture', '#7C3AED'],
    ['other', '#2D5A3D'],
  ] as const)('uses the saturated %s map color', (category, color) => {
    expect(getDiscoveryMapColor(category)).toBe(color)
  })
})

describe('toDiscoveryFeatureCollection', () => {
  it('keeps the worker payload limited to id, coordinates, and category', () => {
    const discovery = {
      id: 7,
      name: 'Hidden from worker',
      category: 'plant' as const,
      imageObjectKey: 'private/photo.jpg',
      coordinates: [6.1, 46.2] as [number, number],
    }

    expect(toDiscoveryFeatureCollection([discovery])).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 7,
          geometry: { type: 'Point', coordinates: [6.1, 46.2] },
          properties: { category: 'plant' },
        },
      ],
    })
  })
})
