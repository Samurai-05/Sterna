import { useEffect, useState, type RefObject } from 'react'

import { getDiscoveryDetailExpandedSnapPoint } from '@/lib/discovery-detail'

export function useMeasuredDrawerSnapPoint({
  controlsRef,
  contentRef,
  enabled = true,
  isExpanded,
  measurementKey,
  onSnapPointChange,
}: {
  controlsRef: RefObject<HTMLDivElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  enabled?: boolean
  isExpanded: boolean
  measurementKey: number | string | null
  onSnapPointChange: (snapPoint: string | number) => void
}) {
  const [expandedSnapPoint, setExpandedSnapPoint] = useState<number | null>(
    null,
  )

  useEffect(() => {
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

      const measureExpandedSnapPoint = () => {
        const viewportHeight =
          window.visualViewport?.height || window.innerHeight
        if (!viewportHeight) return

        const nextSnapPoint = getDiscoveryDetailExpandedSnapPoint({
          contentHeight: content.scrollHeight,
          controlsHeight: controls.getBoundingClientRect().height,
          viewportHeight,
        })
        if (nextSnapPoint <= 0) return

        setExpandedSnapPoint((current) =>
          current !== null && Math.abs(current - nextSnapPoint) < 0.001
            ? current
            : nextSnapPoint,
        )
        if (isExpanded) onSnapPointChange(nextSnapPoint)
      }

      measureExpandedSnapPoint()
      if (typeof ResizeObserver !== 'function') return

      resizeObserver = new ResizeObserver(measureExpandedSnapPoint)
      resizeObserver.observe(controls)
      resizeObserver.observe(content)
      window.visualViewport?.addEventListener(
        'resize',
        measureExpandedSnapPoint,
      )

      return () => {
        resizeObserver?.disconnect()
        window.visualViewport?.removeEventListener(
          'resize',
          measureExpandedSnapPoint,
        )
      }
    }

    const cleanupMeasurement = attachMeasurement()

    return () => {
      if (retryId !== undefined) window.clearTimeout(retryId)
      cleanupMeasurement?.()
    }
  }, [
    contentRef,
    controlsRef,
    enabled,
    isExpanded,
    measurementKey,
    onSnapPointChange,
  ])

  return expandedSnapPoint
}
