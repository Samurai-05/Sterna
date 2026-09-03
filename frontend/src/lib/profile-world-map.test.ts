import { describe, expect, it } from 'vitest'

import {
  MAP_WIDTH,
  projectCountryGeometry,
  unwrapRingLongitudes,
  type Coordinate,
} from './profile-world-map'

describe('profile-world-map geometry projection', () => {
  it('unwraps consecutive longitudes across the 180th meridian', () => {
    const ring: Coordinate[] = [
      [170, 60],
      [179, 60],
      [-179, 60],
      [-170, 60],
      [170, 60],
    ]

    const unwrapped = unwrapRingLongitudes(ring)

    expect(unwrapped).toEqual([
      [170, 60],
      [179, 60],
      [181, 60],
      [190, 60],
      [170, 60],
    ])
  })

  it('projects dateline-crossing polygons without giant segments spanning the map width', () => {
    const datelineCrossingPolygon = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [170, 60],
          [179, 60],
          [-179, 60],
          [-170, 60],
          [170, 60],
        ] as Coordinate[],
      ],
    }

    const path = projectCountryGeometry(datelineCrossingPolygon)
    expect(path).toBeTruthy()

    // Extract all segments (M x y, L x y) and check delta x between consecutive points
    const commands = path.match(/[ML][^MLZ]+/g) ?? []
    let previousX: number | null = null

    for (const command of commands) {
      const type = command[0]
      const [xStr] = command.slice(1).trim().split(' ')
      const x = Number.parseFloat(xStr)

      if (type === 'L' && previousX !== null) {
        const dx = Math.abs(x - previousX)
        // A direct jump across the dateline without wrapping would span > 900px
        expect(dx).toBeLessThan(MAP_WIDTH * 0.3)
      }

      previousX = x
    }
  })

  it('supports Polygon geometry', () => {
    const polygon = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [-5, 40],
          [10, 40],
          [10, 52],
          [-5, 52],
          [-5, 40],
        ] as Coordinate[],
      ],
    }

    const path = projectCountryGeometry(polygon)
    expect(path).toContain('M')
    expect(path).toContain('Z')
    expect(path.split('Z').filter(Boolean).length).toBe(1)
  })

  it('supports MultiPolygon geometry', () => {
    const multiPolygon = {
      type: 'MultiPolygon' as const,
      coordinates: [
        [
          [
            [-5, 40],
            [10, 40],
            [10, 52],
            [-5, 52],
            [-5, 40],
          ] as Coordinate[],
        ],
        [
          [
            [20, 40],
            [30, 40],
            [30, 50],
            [20, 50],
            [20, 40],
          ] as Coordinate[],
        ],
      ],
    }

    const path = projectCountryGeometry(multiPolygon)
    const subpaths = path.split('Z').filter(Boolean)
    expect(subpaths.length).toBe(2)
  })

  it('preserves interior rings for even-odd holes', () => {
    const polygonWithHole = {
      type: 'Polygon' as const,
      coordinates: [
        // Outer ring
        [
          [0, 0],
          [20, 0],
          [20, 20],
          [0, 20],
          [0, 0],
        ] as Coordinate[],
        // Inner hole
        [
          [5, 5],
          [15, 5],
          [15, 15],
          [5, 15],
          [5, 5],
        ] as Coordinate[],
      ],
    }

    const path = projectCountryGeometry(polygonWithHole)
    const subpaths = path.split('Z').filter(Boolean)
    expect(subpaths.length).toBe(2)
  })
})
