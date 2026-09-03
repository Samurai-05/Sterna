import { describe, expect, it } from 'vitest'

import { distanceInKilometres, formatDistance } from './distance'

describe('distanceInKilometres', () => {
  it('returns 0 for identical coordinates', () => {
    expect(distanceInKilometres([6.6, 46.7], [6.6, 46.7])).toBe(0)
  })

  it('orders candidates by how close they are', () => {
    const origin: [number, number] = [2.2945, 48.8584] // Eiffel Tower
    const near: [number, number] = [2.2137, 48.8156] // ~7.8 km away
    const far: [number, number] = [4.835, 45.764] // Lyon, ~390 km away

    expect(distanceInKilometres(origin, near)).toBeLessThan(
      distanceInKilometres(origin, far),
    )
  })
})

describe('formatDistance', () => {
  it('formats sub-kilometre distances in metres', () => {
    expect(formatDistance(0.35)).toBe('350 m away')
  })

  it('rounds up to at least 1 m for a non-zero distance', () => {
    expect(formatDistance(0.0001)).toBe('1 m away')
  })

  it('formats distances under 10 km with one decimal', () => {
    expect(formatDistance(4.2)).toBe('4.2 km away')
  })

  it('rounds distances of 10 km or more to the nearest km', () => {
    expect(formatDistance(12.6)).toBe('13 km away')
  })
})
