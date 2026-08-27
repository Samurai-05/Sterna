import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mapInstances, MockGeolocateControl, MockMap, MockNavigationControl } =
  vi.hoisted(() => {
    const instances: Array<{ controls: unknown[] }> = []

    class NavigationControl {}

    class GeolocateControl {
      trigger() {}
    }

    class MapMock {
      controls: unknown[] = []

      constructor() {
        instances.push(this)
      }

      addControl(control: unknown) {
        this.controls.push(control)
        return this
      }

      getSource() {
        return undefined
      }

      getZoom() {
        return 12
      }

      on() {
        return this
      }

      off() {
        return this
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

const originalUserAgent = window.navigator.userAgent

afterEach(() => {
  mapInstances.length = 0
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: originalUserAgent,
  })
  vi.restoreAllMocks()
})

describe('MapCanvas', () => {
  it('does not add MapLibre zoom controls while keeping geolocation controls', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const { unmount } = render(<MapCanvas />)

    expect(mapInstances).toHaveLength(1)
    expect(mapInstances[0].controls).toHaveLength(1)
    expect(mapInstances[0].controls[0]).toBeInstanceOf(MockGeolocateControl)
    expect(mapInstances[0].controls[0]).not.toBeInstanceOf(
      MockNavigationControl,
    )

    unmount()
  })
})
