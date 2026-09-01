import { createRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  getPhotoMock,
  mapInstances,
  markerInstances,
  popupElements,
  MockGeolocateControl,
  MockMap,
  MockNavigationControl,
} = vi.hoisted(() => {
  const instances: Array<{
    options: { center: [number, number]; zoom: number }
    controls: unknown[]
    emit: (event: string) => void
    resizeCalls: number
    flyToCalls: Array<{ center: [number, number]; zoom: number }>
    bounds: { west: number; south: number; east: number; north: number }
  }> = []
  const markers: Array<{ element?: HTMLElement; removed: boolean }> = []
  const popupElements: HTMLElement[] = []
  const getPhoto = vi.fn().mockResolvedValue(new Blob(['image']))

  class NavigationControl {}

  class GeolocateControl {
    trigger() {}
  }

  class MapMock {
    options: { center: [number, number]; zoom: number }
    controls: unknown[] = []
    resizeCalls = 0
    flyToCalls: Array<{ center: [number, number]; zoom: number }> = []
    bounds = { west: 0, south: 40, east: 10, north: 50 }
    listeners = new Map<string, Set<() => void>>()

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

    getBounds() {
      return {
        getWest: () => this.bounds.west,
        getSouth: () => this.bounds.south,
        getEast: () => this.bounds.east,
        getNorth: () => this.bounds.north,
      }
    }

    on(event: string, listener: () => void) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set())
      }
      this.listeners.get(event)?.add(listener)
      return this
    }

    off(event: string, listener: () => void) {
      this.listeners.get(event)?.delete(listener)
      return this
    }

    emit(event: string) {
      this.listeners.get(event)?.forEach((listener) => listener())
    }

    resize() {
      this.resizeCalls += 1
    }

    flyTo(options: { center: [number, number]; zoom: number }) {
      this.flyToCalls.push(options)
    }

    remove() {}
  }

  return {
    getPhotoMock: getPhoto,
    mapInstances: instances,
    markerInstances: markers,
    popupElements,
    MockGeolocateControl: GeolocateControl,
    MockMap: MapMock,
    MockNavigationControl: NavigationControl,
  }
})

vi.mock('@/lib/api', () => ({
  getPhoto: getPhotoMock,
}))

vi.mock('maplibre-gl', () => {
  class MarkerMock {
    element?: HTMLElement
    removed = false

    constructor(options?: { element?: HTMLElement }) {
      this.element = options?.element
      markerInstances.push(this)
    }

    setLngLat() {
      return this
    }

    addTo() {
      return this
    }

    remove() {
      this.removed = true
    }
  }

  class PopupMock {
    setDOMContent(content: HTMLElement) {
      popupElements.push(content)
      return this
    }

    setLngLat() {
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
  markerInstances.length = 0
  popupElements.length = 0
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

  it('flies to a selected search result', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    const mapRef = createRef<MapCanvasHandle>()

    render(<MapCanvas ref={mapRef} />)
    mapRef.current?.flyTo([6.6327, 46.5218], 12)

    expect(mapInstances[0].flyToCalls).toEqual([
      { center: [6.6327, 46.5218], zoom: 12 },
    ])
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

  it('uses the current position supplied for a first map opening', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas initialViewport={{ center: [7.4474, 46.948], zoom: 13 }} />,
    )

    expect(mapInstances[0].options).toMatchObject({
      center: [7.4474, 46.948],
      zoom: 13,
    })
  })

  it('does not instantiate POI markers below the minimum zoom', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        initialViewport={{ center: [2.2945, 48.8584], zoom: 4 }}
        landmarks={[
          {
            id: 'poi-1',
            name: 'Eiffel Tower',
            imageId: 'eiffel',
            discovered: true,
            coordinates: [2.2945, 48.8584],
          },
        ]}
      />,
    )

    expect(markerInstances).toHaveLength(0)

    mapInstances[0].options.zoom = 5
    act(() => mapInstances[0].emit('zoomend'))
    expect(markerInstances).toHaveLength(1)
  })

  it('creates only POI markers inside the buffered viewport', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 5 }}
        landmarks={[
          {
            id: 'inside',
            name: 'Inside',
            imageId: 'inside',
            discovered: false,
            coordinates: [6, 46],
          },
          {
            id: 'outside',
            name: 'Outside',
            imageId: 'outside',
            discovered: false,
            coordinates: [30, 60],
          },
        ]}
      />,
    )

    expect(markerInstances).toHaveLength(1)
    expect(
      (markerInstances[0].element as HTMLElement).querySelector('img'),
    ).toHaveAttribute('src', expect.stringContaining('w=192'))
  })

  it('does not fetch discovery photos below the preview threshold', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        discoveries={[
          {
            id: 1,
            name: 'Discovery',
            category: 'landscape',
            imageId: 'fallback',
            imageObjectKey: 'photos/example.jpg',
            coordinates: [6, 46],
          },
        ]}
        photoAccessToken="token"
      />,
    )

    expect(getPhotoMock).not.toHaveBeenCalled()

    mapInstances[0].options.zoom = 13
    act(() => mapInstances[0].emit('zoomend'))

    expect(getPhotoMock).toHaveBeenCalledWith(
      'token',
      'photos/example.jpg',
      'map',
    )
  })

  it('shows a neutral map photo placeholder while the preview loads', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    getPhotoMock.mockReturnValue(new Promise(() => undefined))

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 13 }}
        discoveries={[
          {
            id: 1,
            name: 'Discovery',
            category: 'landscape',
            imageId: 'fallback',
            imageObjectKey: 'photos/example.jpg',
            coordinates: [6, 46],
          },
        ]}
        photoAccessToken="token"
      />,
    )

    expect(getPhotoMock).toHaveBeenCalledWith(
      'token',
      'photos/example.jpg',
      'map',
    )
    expect(popupElements[0].querySelector('img')).toBeNull()
    expect(popupElements[0].innerHTML).not.toContain('images.unsplash.com')
  })

  it('updates POI markers when the map viewport moves', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 5 }}
        landmarks={[
          {
            id: 'poi-1',
            name: 'POI',
            imageId: 'poi',
            discovered: false,
            coordinates: [6, 46],
          },
        ]}
      />,
    )

    expect(markerInstances).toHaveLength(1)
    mapInstances[0].bounds = { west: 20, south: 40, east: 30, north: 50 }
    act(() => mapInstances[0].emit('moveend'))

    expect(markerInstances[0].removed).toBe(true)
  })
})
