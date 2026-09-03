import { describe, expect, it } from 'vitest'

import {
  COLLISION_GAP_PX,
  MAX_POI_OFFSET_PX,
  resolveMarkerCollision,
  type CollisionCircle,
} from './map-marker-collision'

const viewport = { width: 320, height: 640 }

function circle(x: number, y: number, radius: number): CollisionCircle {
  return { x, y, radius }
}

describe('resolveMarkerCollision', () => {
  it('returns no offset when the POI is clear of every discovery', () => {
    expect(
      resolveMarkerCollision(
        circle(160, 320, 18),
        [circle(220, 320, 20)],
        viewport,
      ),
    ).toEqual({ x: 0, y: 0 })
  })

  it('moves a colliding POI outward by the smallest required distance', () => {
    const offset = resolveMarkerCollision(
      circle(180, 320, 18),
      [circle(160, 320, 20)],
      viewport,
    )

    expect(offset.x).toBeGreaterThan(0)
    expect(Math.abs(offset.y)).toBeLessThan(1)
    expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(
      18 + 20 + COLLISION_GAP_PX - 20,
      5,
    )
  })

  it('prefers a nearby inward direction when the ideal direction leaves the viewport', () => {
    const offset = resolveMarkerCollision(
      circle(305, 320, 18),
      [circle(300, 320, 20)],
      viewport,
    )

    expect(offset.x).toBeLessThanOrEqual(320 - 4 - 18 - 0.001)
    expect(offset.x).toBeLessThan(0)
  })

  it('keeps multiple POIs deterministic and bounded', () => {
    const occupied = [circle(160, 320, 22), circle(190, 320, 18)]
    const first = resolveMarkerCollision(
      circle(175, 320, 18),
      occupied,
      viewport,
    )
    const second = resolveMarkerCollision(
      circle(175, 320, 18),
      occupied,
      viewport,
    )

    expect(second).toEqual(first)
    expect(Math.hypot(first.x, first.y)).toBeLessThanOrEqual(MAX_POI_OFFSET_PX)
  })
})
