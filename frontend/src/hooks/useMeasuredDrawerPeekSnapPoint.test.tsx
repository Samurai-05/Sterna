import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMeasuredDrawerPeekSnapPoint } from './useMeasuredDrawerPeekSnapPoint'

describe('useMeasuredDrawerPeekSnapPoint', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('cleans up a retry-attached observer and viewport listener on unmount', () => {
    vi.useFakeTimers()

    const controlsRef: { current: HTMLDivElement | null } = { current: null }
    const observerInstances: Array<{
      callback: ResizeObserverCallback
      disconnect: ReturnType<typeof vi.fn>
      observe: ReturnType<typeof vi.fn>
    }> = []
    class FakeResizeObserver {
      callback: ResizeObserverCallback
      disconnect = vi.fn()
      observe = vi.fn()

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        observerInstances.push(this)
      }
    }
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { addEventListener, removeEventListener },
    })

    const { result, unmount } = renderHook(() =>
      useMeasuredDrawerPeekSnapPoint({
        controlsRef,
        measurementKey: 'discovery-7',
      }),
    )
    expect(result.current).toBe(96)

    const controls = document.createElement('div')
    vi.spyOn(controls, 'getBoundingClientRect').mockReturnValue({
      height: 121.2,
    } as DOMRect)
    controlsRef.current = controls

    act(() => vi.runOnlyPendingTimers())

    expect(result.current).toBe(122)
    expect(observerInstances).toHaveLength(1)
    expect(observerInstances[0].observe).toHaveBeenCalledWith(controls)

    vi.spyOn(controls, 'getBoundingClientRect').mockReturnValue({
      height: 133.1,
    } as DOMRect)
    act(() =>
      observerInstances[0].callback(
        [],
        observerInstances[0] as unknown as ResizeObserver,
      ),
    )
    expect(result.current).toBe(134)

    const visualViewportListener = addEventListener.mock.calls[0]?.[1]
    expect(visualViewportListener).toEqual(expect.any(Function))
    vi.spyOn(controls, 'getBoundingClientRect').mockReturnValue({
      height: 141.2,
    } as DOMRect)
    act(() => visualViewportListener?.())
    expect(result.current).toBe(142)

    unmount()

    expect(observerInstances[0].disconnect).toHaveBeenCalledOnce()
    expect(removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    )
    expect(vi.getTimerCount()).toBe(0)
  })
})
