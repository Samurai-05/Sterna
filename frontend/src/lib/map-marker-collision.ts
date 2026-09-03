export interface CollisionCircle {
  x: number
  y: number
  radius: number
}

export interface MarkerOffset {
  x: number
  y: number
}

export interface CollisionViewport {
  width: number
  height: number
}

export interface MarkerCollisionOptions {
  gapPx?: number
  maxOffsetPx?: number
  viewportPaddingPx?: number
}

export const COLLISION_GAP_PX = 6
export const MAX_POI_OFFSET_PX = 64
export const VIEWPORT_PADDING_PX = 4
export const CONNECTOR_MIN_OFFSET_PX = 10

const CANDIDATE_ANGLE_STEP = Math.PI / 8
const CANDIDATE_ANGLE_OFFSETS = [
  0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8,
]
const DEFAULT_DIRECTION_ANGLE = -Math.PI / 4
const SEARCH_STEP_PX = 1
const SEARCH_REFINEMENT_STEPS = 8
const EPSILON = 0.0001

function distanceBetween(first: CollisionCircle, second: CollisionCircle) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function offsetMagnitude(offset: MarkerOffset) {
  return Math.hypot(offset.x, offset.y)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clampOffsetToViewport(
  poi: CollisionCircle,
  offset: MarkerOffset,
  viewport: CollisionViewport,
  padding: number,
): MarkerOffset {
  const minX = padding + poi.radius
  const maxX = viewport.width - padding - poi.radius
  const minY = padding + poi.radius
  const maxY = viewport.height - padding - poi.radius
  const boundedX = clamp(
    poi.x + offset.x,
    minX <= maxX ? minX : viewport.width / 2,
    minX <= maxX ? maxX : viewport.width / 2,
  )
  const boundedY = clamp(
    poi.y + offset.y,
    minY <= maxY ? minY : viewport.height / 2,
    minY <= maxY ? maxY : viewport.height / 2,
  )

  return { x: boundedX - poi.x, y: boundedY - poi.y }
}

function isInsideViewport(
  poi: CollisionCircle,
  offset: MarkerOffset,
  viewport: CollisionViewport,
  padding: number,
) {
  const centerX = poi.x + offset.x
  const centerY = poi.y + offset.y
  return (
    centerX >= padding + poi.radius - EPSILON &&
    centerX <= viewport.width - padding - poi.radius + EPSILON &&
    centerY >= padding + poi.radius - EPSILON &&
    centerY <= viewport.height - padding - poi.radius + EPSILON
  )
}

function isClear(
  poi: CollisionCircle,
  offset: MarkerOffset,
  occupied: CollisionCircle[],
  gap: number,
) {
  const displaced = { ...poi, x: poi.x + offset.x, y: poi.y + offset.y }
  return occupied.every(
    (circle) =>
      distanceBetween(displaced, circle) >=
      displaced.radius + circle.radius + gap - EPSILON,
  )
}

function collisionPenalty(
  poi: CollisionCircle,
  offset: MarkerOffset,
  occupied: CollisionCircle[],
  gap: number,
) {
  const displaced = { ...poi, x: poi.x + offset.x, y: poi.y + offset.y }
  return occupied.reduce((penalty, circle) => {
    const requiredDistance = displaced.radius + circle.radius + gap
    return (
      penalty +
      Math.max(0, requiredDistance - distanceBetween(displaced, circle))
    )
  }, 0)
}

function getIdealDirection(
  poi: CollisionCircle,
  overlapping: CollisionCircle[],
  gap: number,
) {
  let x = 0
  let y = 0

  for (const circle of overlapping) {
    const dx = poi.x - circle.x
    const dy = poi.y - circle.y
    const distance = Math.hypot(dx, dy)
    const overlap =
      poi.radius + circle.radius + gap - Math.max(distance, EPSILON)

    if (distance > EPSILON && overlap > 0) {
      x += (dx / distance) * overlap
      y += (dy / distance) * overlap
    }
  }

  return Math.hypot(x, y) > EPSILON ? Math.atan2(y, x) : DEFAULT_DIRECTION_ANGLE
}

function candidateOffset(
  poi: CollisionCircle,
  angle: number,
  distance: number,
  viewport: CollisionViewport,
  padding: number,
): MarkerOffset {
  const offset = clampOffsetToViewport(
    poi,
    { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance },
    viewport,
    padding,
  )
  const magnitude = offsetMagnitude(offset)
  if (magnitude <= distance + EPSILON || magnitude <= EPSILON) return offset

  return {
    x: (offset.x / magnitude) * distance,
    y: (offset.y / magnitude) * distance,
  }
}

export function resolveMarkerCollision(
  poi: CollisionCircle,
  occupied: CollisionCircle[],
  viewport: CollisionViewport,
  options: MarkerCollisionOptions = {},
): MarkerOffset {
  const gap = options.gapPx ?? COLLISION_GAP_PX
  const maxOffset = options.maxOffsetPx ?? MAX_POI_OFFSET_PX
  const padding = options.viewportPaddingPx ?? VIEWPORT_PADDING_PX
  const overlapping = occupied.filter(
    (circle) =>
      distanceBetween(poi, circle) < poi.radius + circle.radius + gap - EPSILON,
  )

  if (overlapping.length === 0) return { x: 0, y: 0 }

  const idealAngle = getIdealDirection(poi, overlapping, gap)
  let bestValid: {
    offset: MarkerOffset
    distance: number
    order: number
  } | null = null
  let bestFallback: {
    offset: MarkerOffset
    penalty: number
    distance: number
    order: number
  } = {
    offset: { x: 0, y: 0 },
    penalty: collisionPenalty(poi, { x: 0, y: 0 }, occupied, gap),
    distance: 0,
    order: -1,
  }

  for (let order = 0; order < CANDIDATE_ANGLE_OFFSETS.length; order++) {
    const angle =
      idealAngle + CANDIDATE_ANGLE_OFFSETS[order] * CANDIDATE_ANGLE_STEP
    let previousDistance = 0

    for (
      let distance = 0;
      distance <= maxOffset + EPSILON;
      distance += SEARCH_STEP_PX
    ) {
      const offset = candidateOffset(
        poi,
        angle,
        Math.min(distance, maxOffset),
        viewport,
        padding,
      )
      const magnitude = offsetMagnitude(offset)
      const penalty = collisionPenalty(poi, offset, occupied, gap)
      const isBetterFallback =
        penalty < bestFallback.penalty - EPSILON ||
        (Math.abs(penalty - bestFallback.penalty) <= EPSILON &&
          (magnitude > bestFallback.distance + EPSILON ||
            (Math.abs(magnitude - bestFallback.distance) <= EPSILON &&
              order < bestFallback.order)))

      if (isBetterFallback) {
        bestFallback = { offset, penalty, distance: magnitude, order }
      }

      if (
        isInsideViewport(poi, offset, viewport, padding) &&
        isClear(poi, offset, occupied, gap)
      ) {
        let low = previousDistance
        let high = Math.min(distance, maxOffset)
        for (let step = 0; step < SEARCH_REFINEMENT_STEPS; step++) {
          const middle = (low + high) / 2
          const refined = candidateOffset(poi, angle, middle, viewport, padding)
          if (
            isInsideViewport(poi, refined, viewport, padding) &&
            isClear(poi, refined, occupied, gap)
          ) {
            high = middle
          } else {
            low = middle
          }
        }

        const resolved = candidateOffset(poi, angle, high, viewport, padding)
        const resolvedDistance = offsetMagnitude(resolved)
        if (
          bestValid === null ||
          resolvedDistance < bestValid.distance - EPSILON ||
          (Math.abs(resolvedDistance - bestValid.distance) <= EPSILON &&
            order < bestValid.order)
        ) {
          bestValid = { offset: resolved, distance: resolvedDistance, order }
        }
        break
      }

      previousDistance = distance
    }
  }

  return bestValid?.offset ?? bestFallback.offset
}
