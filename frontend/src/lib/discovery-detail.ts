const MIN_EXPANDED_SNAP_GAP = 48
const EXPANDED_TOP_INSET = 16

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

  const peekHeight = Math.ceil(Math.max(0, controlsHeight))
  const expandedHeight = Math.ceil(
    Math.max(
      contentHeight + controlsHeight,
      peekHeight + MIN_EXPANDED_SNAP_GAP,
    ),
  )
  const maximumExpandedHeight = Math.max(0, viewportHeight - EXPANDED_TOP_INSET)

  if (maximumExpandedHeight < peekHeight + MIN_EXPANDED_SNAP_GAP) {
    return null
  }

  return Math.min(maximumExpandedHeight, expandedHeight)
}
