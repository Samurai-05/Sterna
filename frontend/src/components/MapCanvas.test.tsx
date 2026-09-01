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
    options: { center: [number, number]; zoom: number; minZoom?: number }
    controls: unknown[]
    addLayerCalls: Array<{ layer: unknown; beforeId?: string }>
    addSourceCalls: Array<{ id: string; source: unknown }>
    featureStateCalls: Array<{ target: unknown; state: unknown }>
    emit: (event: string) => void
    resizeCalls: number
    flyToCalls: Array<{ center: [number, number]; zoom: number }>
    resetNorthPitchCalls: number
    bounds: { west: number; south: number; east: number; north: number }
  }> = []
  const markers: Array<{
    element?: HTMLElement
    opacityWhenCovered?: string | number
    removed: boolean
  }> = []
  const popupElements: HTMLElement[] = []
  const getPhoto = vi.fn().mockResolvedValue(new Blob(['image']))

  class NavigationControl {}

  class GeolocateControl {
    trigger() {}
  }

  class MapMock {
    options: { center: [number, number]; zoom: number; minZoom?: number }
    controls: unknown[] = []
    addLayerCalls: Array<{ layer: unknown; beforeId?: string }> = []
    addSourceCalls: Array<{ id: string; source: unknown }> = []
    featureStateCalls: Array<{ target: unknown; state: unknown }> = []
    sources = new Map<string, unknown>()
    resizeCalls = 0
    flyToCalls: Array<{ center: [number, number]; zoom: number }> = []
    resetNorthPitchCalls = 0
    bounds = { west: 0, south: 40, east: 10, north: 50 }
    listeners = new Map<string, Set<() => void>>()

    constructor(options: {
      center: [number, number]
      zoom: number
      minZoom?: number
    }) {
      this.options = options
      instances.push(this)
    }

    addControl(control: unknown) {
      this.controls.push(control)
      return this
    }

    getSource(id: string) {
      return this.sources.get(id)
    }

    addSource(id: string, source: unknown) {
      this.sources.set(id, source)
      this.addSourceCalls.push({ id, source })
      return this
    }

    addLayer(layer: unknown, beforeId?: string) {
      this.addLayerCalls.push({ layer, beforeId })
      return this
    }

    getStyle() {
      return {
        layers: [
          { id: 'base-roads', type: 'line', 'source-layer': 'transportation' },
          { id: 'boundary_3', type: 'line', 'source-layer': 'boundary' },
          { id: 'label_city', type: 'symbol' },
        ],
      }
    }

    isSourceLoaded() {
      return true
    }

    setFeatureState(target: unknown, state: unknown) {
      this.featureStateCalls.push({ target, state })
      return this
    }

    setProjection() {
      return this
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

    resetNorthPitch() {
      this.resetNorthPitchCalls += 1
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
    opacityWhenCovered?: string | number
    removed = false

    constructor(options?: {
      element?: HTMLElement
      opacityWhenCovered?: string | number
    }) {
      this.element = options?.element
      this.opacityWhenCovered = options?.opacityWhenCovered
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

  it('resets bearing and pitch to north-up on demand', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    const mapRef = createRef<MapCanvasHandle>()

    render(<MapCanvas ref={mapRef} />)
    mapRef.current?.resetNorth()

    expect(mapInstances[0].resetNorthPitchCalls).toBe(1)
  })

  it('clamps the map to the globe minimum zoom', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas />)

    expect(mapInstances[0].options.minZoom).toBe(1.5)
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

  it('adds the frontend fog source and layer below native boundaries', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas exploredCountryCodes={['DEU']} />)

    act(() => mapInstances[0].emit('load'))
    act(() => mapInstances[0].emit('sourcedata'))

    expect(mapInstances[0].addSourceCalls).toEqual([
      {
        id: 'countries-fog',
        source: {
          type: 'geojson',
          data: '/countries-fog.geo.json',
          promoteId: 'A3',
        },
      },
    ])
    expect(mapInstances[0].addLayerCalls).toHaveLength(1)
    expect(mapInstances[0].addLayerCalls[0]).toMatchObject({
      beforeId: 'boundary_3',
      layer: {
        id: 'unexplored-countries-fog',
        type: 'fill',
        source: 'countries-fog',
        maxzoom: 9,
        paint: {
          'fill-color': '#2f4439',
        },
      },
    })
    expect(
      (
        mapInstances[0].addLayerCalls[0].layer as {
          paint: { 'fill-opacity': unknown[] }
        }
      ).paint['fill-opacity'].slice(0, 3),
    ).toEqual(['case', ['boolean', ['feature-state', 'explored'], false], 0])
  })

  it('updates fog feature-state for personal, group, and disputed countries', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const { rerender } = render(
      <MapCanvas exploredCountryCodes={['RUS', 'CHE']} />,
    )
    act(() => mapInstances[0].emit('load'))
    act(() => mapInstances[0].emit('sourcedata'))

    expect(mapInstances[0].featureStateCalls).toEqual([
      {
        target: { source: 'countries-fog', id: 'RUS' },
        state: { explored: true },
      },
      {
        target: { source: 'countries-fog', id: 'CHE' },
        state: { explored: true },
      },
      {
        target: { source: 'countries-fog', id: 'XCR' },
        state: { explored: true },
      },
    ])

    rerender(<MapCanvas exploredCountryCodes={['UKR']} />)

    expect(mapInstances[0].featureStateCalls.slice(-4)).toEqual(
      expect.arrayContaining([
        {
          target: { source: 'countries-fog', id: 'UKR' },
          state: { explored: true },
        },
        {
          target: { source: 'countries-fog', id: 'XCR' },
          state: { explored: true },
        },
        {
          target: { source: 'countries-fog', id: 'RUS' },
          state: { explored: false },
        },
        {
          target: { source: 'countries-fog', id: 'CHE' },
          state: { explored: false },
        },
      ]),
    )
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

  it('hides discovery and POI markers outright on the far side of the globe', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 5 }}
        discoveries={[
          {
            id: 1,
            name: 'Eiffel Tower',
            category: 'monument',
            imageId: 'eiffel',
            coordinates: [6, 46],
          },
        ]}
        landmarks={[
          {
            id: 'poi-1',
            name: 'Statue of Liberty',
            imageId: 'liberty',
            discovered: true,
            coordinates: [6, 46],
          },
        ]}
      />,
    )

    // markerInstances[0] is the discovery (created immediately); the POI
    // marker is created inside the same synchronous mount via
    // updateLandmarkMarkers(), so both exist by the time render() returns.
    expect(markerInstances).toHaveLength(2)
    expect(markerInstances[0].opacityWhenCovered).toBe(0)
    expect(markerInstances[1].opacityWhenCovered).toBe(0)
  })

  it('shrinks discovery markers when zoomed out and restores full size up close', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        discoveries={[
          {
            id: 1,
            name: 'Eiffel Tower',
            category: 'monument',
            imageId: 'eiffel',
            coordinates: [2.2945, 48.8584],
          },
        ]}
      />,
    )

    // The scale is applied to the marker's inner span, not the button
    // itself — the button stays a fixed-size tap target (see the next test).
    const [marker] = markerInstances
    const button = marker.element?.firstElementChild as HTMLElement
    const scaledElement = button.firstElementChild as HTMLElement

    mapInstances[0].options.zoom = 1.5
    mapInstances[0].emit('zoom')
    expect(scaledElement.style.transform).toBe('scale(0.35)')

    mapInstances[0].options.zoom = 6
    mapInstances[0].emit('zoom')
    expect(scaledElement.style.transform).toBe('scale(1)')
  })

  it('keeps the discovery marker button at a fixed, comfortably tappable size', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        initialViewport={{ center: [2.2945, 48.8584], zoom: 1.5 }}
        discoveries={[
          {
            id: 1,
            name: 'Eiffel Tower',
            category: 'monument',
            imageId: 'eiffel',
            coordinates: [2.2945, 48.8584],
          },
        ]}
      />,
    )

    const [marker] = markerInstances
    const button = marker.element?.firstElementChild as HTMLElement

    // The tap target itself must never be scaled down, even at minimum
    // zoom — only the pin's visual content (its inner span) shrinks.
    expect(button.style.transform).toBe('')
    expect(button.className).toContain('size-11')
  })

  it('applies the correct marker scale immediately, before any zoom event', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    // Regression test: the scale used to only be applied by updateMarkerScale()
    // running after root.render(), but React does not guarantee a ref is
    // attached by the time render() returns. A marker mounted while the map
    // is already zoomed out — with no 'zoom' event ever following — used to
    // sit at scale(1) until the next zoom change.
    render(
      <MapCanvas
        initialViewport={{ center: [2.2945, 48.8584], zoom: 1.5 }}
        discoveries={[
          {
            id: 1,
            name: 'Eiffel Tower',
            category: 'monument',
            imageId: 'eiffel',
            coordinates: [2.2945, 48.8584],
          },
        ]}
      />,
    )

    const [marker] = markerInstances
    const button = marker.element?.firstElementChild as HTMLElement
    const scaledElement = button.firstElementChild as HTMLElement

    expect(scaledElement.style.transform).toBe('scale(0.35)')
  })

  it('applies the correct scale to a discovery that arrives after the map is already zoomed out', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    // Mirrors discoveries loading from the API after the map has mounted
    // and the user has already zoomed out, with no further zoom event.
    const { rerender } = render(
      <MapCanvas
        initialViewport={{ center: [2.2945, 48.8584], zoom: 1.5 }}
        discoveries={[]}
      />,
    )

    rerender(
      <MapCanvas
        initialViewport={{ center: [2.2945, 48.8584], zoom: 1.5 }}
        discoveries={[
          {
            id: 1,
            name: 'Eiffel Tower',
            category: 'monument',
            imageId: 'eiffel',
            coordinates: [2.2945, 48.8584],
          },
        ]}
      />,
    )

    const [marker] = markerInstances
    const button = marker.element?.firstElementChild as HTMLElement
    const scaledElement = button.firstElementChild as HTMLElement

    expect(scaledElement.style.transform).toBe('scale(0.35)')
  })

  it('applies the correct scale to a POI marker created after a viewport move, with no zoom event', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    // POI markers are only ever created dynamically (via updateLandmarkMarkers
    // on moveend/zoomend), never synchronously at mount unless already
    // visible — so this is the realistic path for every POI marker, not an
    // edge case, and the same synchronous-ref-callback fix matters here too.
    // Zoom is fixed at landmarkMinZoom throughout: below it no POI marker is
    // ever created regardless of bounds, and the point here is to move the
    // landmark into the viewport with no zoom CHANGE (no 'zoom' event) — not
    // to also exercise the below-minimum-zoom case, which other tests cover.
    render(
      <MapCanvas
        initialViewport={{ center: [50, 50], zoom: 5 }}
        landmarks={[
          {
            id: 'poi-1',
            name: 'Statue of Liberty',
            imageId: 'liberty',
            discovered: true,
            coordinates: [30, 60],
          },
        ]}
      />,
    )

    expect(markerInstances).toHaveLength(0)

    mapInstances[0].bounds = { west: 20, south: 50, east: 40, north: 70 }
    act(() => mapInstances[0].emit('moveend'))

    const [marker] = markerInstances
    const button = marker.element?.firstElementChild as HTMLElement
    const scaledElement = button.firstElementChild as HTMLElement

    // Same arithmetic as markerScaleForZoom(5) in the source, so this stays
    // exact without duplicating (and risking transcribing wrong) its output.
    const expectedScale = 0.35 + ((5 - 1.5) / (6 - 1.5)) * (1 - 0.35)
    expect(scaledElement.style.transform).toBe(`scale(${expectedScale})`)
  })
})
