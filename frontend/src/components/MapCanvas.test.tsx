import { createRef } from 'react'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mapInstances, MockGeolocateControl, MockMap, MockNavigationControl } =
  vi.hoisted(() => {
    const instances: Array<{
      options: { center: [number, number]; zoom: number }
      controls: unknown[]
      emit: (event: string) => void
      resizeCalls: number
    }> = []

    class NavigationControl {}

    class GeolocateControl {
      trigger() {}
    }

    class MapMock {
      options: { center: [number, number]; zoom: number }
      controls: unknown[] = []
      resizeCalls = 0
      listeners = new Map<string, () => void>()

      constructor(options: { center: [number, number]; zoom: number }) {
        this.options = options
        instances.push(this)
      }

      addControl(control: unknown) {
        this.controls.push(control)
        return this
      }

      getSource() {
        return undefined
      }

      getCenter() {
        return { lng: this.options.center[0], lat: this.options.center[1] }
      }

      getZoom() {
        return this.options.zoom
      }

      on(event: string, listener: () => void) {
        this.listeners.set(event, listener)
        return this
      }

      off(event: string) {
        this.listeners.delete(event)
        return this
      }

      emit(event: string) {
        this.listeners.get(event)?.()
      }

      resize() {
        this.resizeCalls += 1
      }

      remove() {}
    }

    return {
      mapInstances: instances,
      MockGeolocateControl: GeolocateControl,
      MockMap: MapMock,
      MockNavigationControl: NavigationControl,
    }
  })

vi.mock('maplibre-gl', () => {
  class MarkerMock {
    setLngLat() {
      return this
    }

    addTo() {
      return this
    }

    remove() {}
  }

  class PopupMock {
    setLngLat() {
      return this
    }

    setDOMContent() {
      return this
    }

    addTo() {
      return this
    }

    remove() {}

    isOpen() {
      return false
    }
  }

  return {
    GeolocateControl: MockGeolocateControl,
    Map: MockMap,
    Marker: MarkerMock,
    NavigationControl: MockNavigationControl,
    Popup: PopupMock,
    setWorkerUrl: vi.fn(),
  }
})

import { MapCanvas } from './MapCanvas'
import type { MapCanvasHandle } from './MapCanvas'

const originalUserAgent = window.navigator.userAgent

afterEach(() => {
  mapInstances.length = 0
  window.sessionStorage.clear()
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: originalUserAgent,
  })
  vi.restoreAllMocks()
})

describe('MapCanvas', () => {
  it('exposes a resize method for a persistent map shell', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    const mapRef = createRef<MapCanvasHandle & { resize: () => void }>()

    render(<MapCanvas ref={mapRef} />)

    expect(mapRef.current?.resize).toBeTypeOf('function')
    mapRef.current?.resize()
    expect(mapInstances[0].resizeCalls).toBe(1)
  })

  it('does not add MapLibre zoom controls while keeping geolocation controls', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const { unmount } = render(<MapCanvas />)

    expect(mapInstances).toHaveLength(1)
    expect(mapInstances[0].options).toMatchObject({
      center: [2.3522, 48.8566],
      zoom: 12,
    })
    expect(mapInstances[0].controls).toHaveLength(1)
    expect(mapInstances[0].controls[0]).toBeInstanceOf(MockGeolocateControl)
    expect(mapInstances[0].controls[0]).not.toBeInstanceOf(
      MockNavigationControl,
    )

    unmount()
  })

  it('restores the viewport saved by a previous map instance', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const first = render(<MapCanvas />)
    mapInstances[0].options.center = [7.4474, 46.948]
    mapInstances[0].options.zoom = 15.5
    mapInstances[0].emit('moveend')
    first.unmount()

    render(<MapCanvas />)

    expect(mapInstances[1].options).toMatchObject({
      center: [7.4474, 46.948],
      zoom: 15.5,
    })
  })
})
