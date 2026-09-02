import { useLayoutEffect, useState, type RefObject } from 'react'

import { getDiscoveryDetailExpandedSnapPoint } from '@/lib/discovery-detail'

type DrawerSnapPoints = {
  peek: number
  expanded: number | null
}

export function useMeasuredDrawerSnapPoints({
  controlsRef,
  contentRef,
  enabled = true,
  measurementKey,
  onSnapPointsChange,
}: {
  controlsRef: RefObject<HTMLDivElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  enabled?: boolean
  measurementKey: number | string | null
  onSnapPointsChange: (snapPoints: DrawerSnapPoints) => void
}) {
  const [snapPoints, setSnapPoints] = useState<DrawerSnapPoints | null>(null)

  useLayoutEffect(() => {
    if (!enabled) return

    let retryId: number | undefined
    let resizeObserver: ResizeObserver | undefined

    const attachMeasurement = () => {
      const controls = controlsRef.current
      const content = contentRef.current
      if (!controls || !content) {
        retryId = window.setTimeout(attachMeasurement, 0)
        return
      }

      const measureSnapPoints = () => {
        const viewportHeight =
          window.visualViewport?.height || window.innerHeight
        if (!viewportHeight) return

        const controlsHeight = controls.getBoundingClientRect().height
        const nextSnapPoints = {
          peek: Math.ceil(controlsHeight),
          expanded: getDiscoveryDetailExpandedSnapPoint({
            contentHeight: content.scrollHeight,
            controlsHeight,
            viewportHeight,
          }),
        }
        if (nextSnapPoints.peek <= 0) return

        setSnapPoints((current) =>
          current !== null &&
          current.peek === nextSnapPoints.peek &&
          current.expanded === nextSnapPoints.expanded
            ? current
            : nextSnapPoints,
        )
        onSnapPointsChange(nextSnapPoints)
      }

      measureSnapPoints()
      if (typeof ResizeObserver !== 'function') return

      resizeObserver = new ResizeObserver(measureSnapPoints)
      resizeObserver.observe(controls)
      resizeObserver.observe(content)
      window.visualViewport?.addEventListener('resize', measureSnapPoints)

      return () => {
        resizeObserver?.disconnect()
        window.visualViewport?.removeEventListener('resize', measureSnapPoints)
      }
    }

    const cleanupMeasurement = attachMeasurement()

    return () => {
      if (retryId !== undefined) window.clearTimeout(retryId)
      cleanupMeasurement?.()
    }
  }, [contentRef, controlsRef, enabled, measurementKey, onSnapPointsChange])

  return snapPoints
}
