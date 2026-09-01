const MAX_EXPANDED_SNAP_POINT = 0.5

export function getDiscoveryDetailExpandedSnapPoint({
  contentHeight,
  controlsHeight,
  viewportHeight,
}: {
  contentHeight: number
  controlsHeight: number
  viewportHeight: number
}) {
  if (viewportHeight <= 0) return 0

  return Math.min(
    MAX_EXPANDED_SNAP_POINT,
    Math.max(0, (contentHeight + controlsHeight) / viewportHeight),
  )
}
