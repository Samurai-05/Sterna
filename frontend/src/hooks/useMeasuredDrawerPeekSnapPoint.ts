import { useLayoutEffect, useState, type RefObject } from 'react'

export function useMeasuredDrawerPeekSnapPoint({
  controlsRef,
  enabled = true,
  fallbackSnapPoint = 96,
  measurementKey,
}: {
  controlsRef: RefObject<HTMLElement | null>
  enabled?: boolean
  fallbackSnapPoint?: number
  measurementKey: number | string | null
}) {
  const [peekSnapPoint, setPeekSnapPoint] = useState(fallbackSnapPoint)

  useLayoutEffect(() => {
    if (!enabled) return

    let retryId: number | undefined
    let resizeObserver: ResizeObserver | undefined

    const attachMeasurement = () => {
      const controls = controlsRef.current
      if (!controls) {
        retryId = window.setTimeout(attachMeasurement, 0)
        return
      }

      const measurePeekSnapPoint = () => {
        const nextPeekSnapPoint = Math.ceil(
          controls.getBoundingClientRect().height,
        )
        if (nextPeekSnapPoint <= 0) return

        setPeekSnapPoint((current) =>
          current === nextPeekSnapPoint ? current : nextPeekSnapPoint,
        )
      }

      measurePeekSnapPoint()
      if (typeof ResizeObserver !== 'function') return

      resizeObserver = new ResizeObserver(measurePeekSnapPoint)
      resizeObserver.observe(controls)
      window.visualViewport?.addEventListener('resize', measurePeekSnapPoint)

      return () => {
        resizeObserver?.disconnect()
        window.visualViewport?.removeEventListener(
          'resize',
          measurePeekSnapPoint,
        )
      }
    }

    const cleanupMeasurement = attachMeasurement()

    return () => {
      if (retryId !== undefined) window.clearTimeout(retryId)
      cleanupMeasurement?.()
    }
  }, [controlsRef, enabled, fallbackSnapPoint, measurementKey])

  return peekSnapPoint
}
