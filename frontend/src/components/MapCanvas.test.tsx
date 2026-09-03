import { createRef } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  getPhotoMock,
  mapInstances,
  markerInstances,
  MockMap,
  ResizeObserverMock,
  resizeObserverInstances,
} = vi.hoisted(() => {
  const instances: Array<{
    options: { center: [number, number]; zoom: number; minZoom?: number }
    controls: unknown[]
    addLayerCalls: Array<{ layer: unknown; beforeId?: string }>
    addSourceCalls: Array<{ id: string; source: unknown }>
    easeToCalls: Array<{
      center: [number, number]
      zoom: number
      duration: number
    }>
    featureStateCalls: Array<{ target: unknown; state: unknown }>
    emit: (event: string, data?: unknown) => void
    resizeCalls: number
    flyToCalls: Array<{ center: [number, number]; zoom: number }>
    resetNorthPitchCalls: number
    setMinZoomCalls: number[]
    setZoomCalls: number[]
    setPaintPropertyCalls: Array<{
      layerId: string
      property: string
      value: unknown
    }>
    cameraForBoundsCalls: Array<{ bounds: unknown; options: unknown }>
    cameraZoom: number
    container: { clientWidth: number; clientHeight: number }
    bounds: { west: number; south: number; east: number; north: number }
    getContainer: () => { clientWidth: number; clientHeight: number }
    getSource: (id: string) => unknown
    cameraForBounds: (bounds: unknown, options: unknown) => { zoom: number }
    setMinZoom: (zoom: number) => unknown
    setZoom: (zoom: number) => unknown
    sourceFeatures: Array<{
      id?: number | string
      geometry: { type: 'Point'; coordinates: [number, number] }
      properties: Record<string, unknown>
    }>
    clusterExpansionZoom: number
    clusterExpansionError?: Error
    clusterLeaves: Array<{
      id?: number | string
      geometry: { type: 'Point'; coordinates: [number, number] }
      properties: Record<string, unknown>
    }>
  }> = []
  const markers: Array<{
    element?: HTMLElement
    opacityWhenCovered?: string | number
    removed: boolean
    coordinates?: [number, number]
  }> = []
  const resizeObserverInstances: Array<{
    callback: ResizeObserverCallback
    trigger: () => void
  }> = []
  const getPhoto = vi.fn().mockResolvedValue(new Blob(['image']))

  class GeoJSONSourceMock {
    data: unknown
    setDataCalls: unknown[] = []
    map: MapMock

    constructor(data: unknown, map: MapMock) {
      this.data = data
      this.map = map
    }

    setData(data: unknown) {
      this.data = data
      this.setDataCalls.push(data)
    }

    getClusterExpansionZoom() {
      if (this.map.clusterExpansionError) {
        return Promise.reject(this.map.clusterExpansionError)
      }
      return Promise.resolve(this.map.clusterExpansionZoom)
    }

    getClusterLeaves() {
      return Promise.resolve(this.map.clusterLeaves)
    }
  }

  class ResizeObserverMock {
    callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
      resizeObserverInstances.push(this)
    }

    observe() {}

    disconnect() {}

    trigger() {
      this.callback([], this as unknown as ResizeObserver)
    }
  }

  class MapMock {
    options: { center: [number, number]; zoom: number; minZoom?: number }
    controls: unknown[] = []
    addLayerCalls: Array<{ layer: unknown; beforeId?: string }> = []
    addSourceCalls: Array<{ id: string; source: unknown }> = []
    easeToCalls: Array<{
      center: [number, number]
      zoom: number
      duration: number
    }> = []
    featureStateCalls: Array<{ target: unknown; state: unknown }> = []
    sources = new Map<string, unknown>()
    resizeCalls = 0
    flyToCalls: Array<{ center: [number, number]; zoom: number }> = []
    resetNorthPitchCalls = 0
    setMinZoomCalls: number[] = []
    setZoomCalls: number[] = []
    setPaintPropertyCalls: Array<{
      layerId: string
      property: string
      value: unknown
    }> = []
    cameraForBoundsCalls: Array<{ bounds: unknown; options: unknown }> = []
    cameraZoom = 1.3
    container = { clientWidth: 320, clientHeight: 640 }
    bounds = { west: 0, south: 40, east: 10, north: 50 }
    sourceFeatures: Array<{
      id?: number | string
      geometry: { type: 'Point'; coordinates: [number, number] }
      properties: Record<string, unknown>
    }> = []
    clusterExpansionZoom = 8
    clusterExpansionError?: Error
    clusterLeaves: Array<{
      id?: number | string
      geometry: { type: 'Point'; coordinates: [number, number] }
      properties: Record<string, unknown>
    }> = []
    listeners = new Map<string, Set<(data?: unknown) => void>>()

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
      const data = (source as { data?: unknown }).data
      this.sources.set(id, new GeoJSONSourceMock(data, this))
      this.addSourceCalls.push({ id, source })
      return this
    }

    querySourceFeatures() {
      return this.sourceFeatures
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
          {
            id: 'label_city',
            type: 'symbol',
            'source-layer': 'place',
            layout: { 'text-field': ['get', 'name'] },
          },
          {
            id: 'label_country_3',
            type: 'symbol',
            'source-layer': 'place',
            layout: { 'text-field': ['get', 'name'] },
          },
          {
            id: 'label_country_2',
            type: 'symbol',
            'source-layer': 'place',
            layout: { 'text-field': ['get', 'name'] },
          },
          {
            id: 'label_country_1',
            type: 'symbol',
            'source-layer': 'place',
            layout: { 'text-field': ['get', 'name'] },
          },
          {
            id: 'country-outline',
            type: 'line',
            'source-layer': 'boundary',
          },
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

    getContainer() {
      return this.container
    }

    cameraForBounds(bounds: unknown, options: unknown) {
      this.cameraForBoundsCalls.push({ bounds, options })
      return { zoom: this.cameraZoom }
    }

    setMinZoom(zoom: number) {
      this.setMinZoomCalls.push(zoom)
      return this
    }

    setZoom(zoom: number) {
      this.setZoomCalls.push(zoom)
      this.options.zoom = zoom
      return this
    }

    setPaintProperty(layerId: string, property: string, value: unknown) {
      this.setPaintPropertyCalls.push({ layerId, property, value })
      return this
    }

    getBounds() {
      return {
        getWest: () => this.bounds.west,
        getSouth: () => this.bounds.south,
        getEast: () => this.bounds.east,
        getNorth: () => this.bounds.north,
      }
    }

    on(event: string, listener: (data?: unknown) => void) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set())
      }
      this.listeners.get(event)?.add(listener)
      return this
    }

    off(event: string, listener: (data?: unknown) => void) {
      this.listeners.get(event)?.delete(listener)
      return this
    }

    emit(event: string, data?: unknown) {
      this.listeners.get(event)?.forEach((listener) => listener(data))
    }

    resize() {
      this.resizeCalls += 1
    }

    flyTo(options: { center: [number, number]; zoom: number }) {
      this.flyToCalls.push(options)
    }

    easeTo(options: {
      center: [number, number]
      zoom: number
      duration: number
    }) {
      this.easeToCalls.push(options)
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
    MockMap: MapMock,
    ResizeObserverMock,
    resizeObserverInstances,
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
    coordinates?: [number, number]

    constructor(options?: {
      element?: HTMLElement
      opacityWhenCovered?: string | number
    }) {
      this.element = options?.element
      this.opacityWhenCovered = options?.opacityWhenCovered
      markerInstances.push(this)
    }

    setLngLat(coordinates: [number, number]) {
      this.coordinates = coordinates
      return this
    }

    addTo() {
      return this
    }

    remove() {
      this.removed = true
    }
  }

  return {
    Map: MockMap,
    Marker: MarkerMock,
    setWorkerUrl: vi.fn(),
  }
})

import { MapCanvas } from './MapCanvas'
import type { DiscoveryMarkerData, MapCanvasHandle } from './MapCanvas'

const originalUserAgent = window.navigator.userAgent

const discoveryMarkerData = {
  id: 1,
  name: 'Discovery',
  category: 'landscape' as const,
  imageId: 'fallback',
  imageObjectKey: 'photos/example.jpg',
  coordinates: [6, 46] as [number, number],
}

const unclusteredFeature = (id: number) => ({
  id,
  geometry: {
    type: 'Point' as const,
    coordinates: [6, 46] as [number, number],
  },
  properties: { category: 'landscape' },
})

const clusterFeature = (
  clusterId: number,
  pointCount = 3,
  coordinates: [number, number] = [6, 46],
) => ({
  geometry: { type: 'Point' as const, coordinates },
  properties: {
    cluster_id: clusterId,
    point_count: pointCount,
    landscapeCount: pointCount,
    monumentCount: 0,
    foodCount: 0,
    animalCount: 0,
    plantCount: 0,
    cultureCount: 0,
    otherCount: 0,
  },
})

async function flushSpatialSync() {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })
}

afterEach(() => {
  getPhotoMock.mockReset()
  getPhotoMock.mockResolvedValue(new Blob(['image']))
  mapInstances.length = 0
  markerInstances.length = 0
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

    expect(mapInstances[0].options.minZoom).toBeUndefined()
    expect(mapInstances[0].setMinZoomCalls).toEqual([3.3])
  })

  it('clamps an initial viewport below the responsive minimum without fitting the map', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const { unmount } = render(
      <MapCanvas initialViewport={{ center: [0, 20], zoom: 1 }} />,
    )

    expect(mapInstances[0].setZoomCalls).toEqual([3.3])
    expect(mapInstances[0].flyToCalls).toEqual([])
    unmount()
    window.sessionStorage.clear()
  })

  it('recalculates the minimum zoom when the map container is resized', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    render(<MapCanvas />)

    mapInstances[0].container = { clientWidth: 800, clientHeight: 400 }
    mapInstances[0].cameraZoom = 1.1
    act(() => resizeObserverInstances[0].trigger())

    expect(mapInstances[0].setMinZoomCalls).toEqual([3.3, 3.1])
    expect(mapInstances[0].flyToCalls).toEqual([])
  })

  it('uses the responsive globe floor without adding built-in controls', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const { unmount } = render(<MapCanvas />)

    expect(mapInstances).toHaveLength(1)
    expect(mapInstances[0].options).toMatchObject({
      center: [0, 20],
      zoom: 3.3,
    })
    expect(mapInstances[0].controls).toHaveLength(0)

    unmount()
  })

  it('only displays a location dot for a verified device position', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const { rerender } = render(<MapCanvas />)
    expect(markerInstances).toHaveLength(0)

    rerender(<MapCanvas userLocation={[7.4474, 46.948]} />)
    expect(markerInstances).toHaveLength(1)
    expect(markerInstances[0].element).toHaveAttribute(
      'aria-label',
      'Your current location',
    )

    rerender(<MapCanvas />)
    expect(markerInstances[0].removed).toBe(true)
  })

  it('adds the frontend fog source and layer below native boundaries', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas exploredCountryCodes={['DEU']} />)

    act(() => mapInstances[0].emit('load'))
    act(() => mapInstances[0].emit('sourcedata'))

    expect(
      mapInstances[0].addSourceCalls.find(({ id }) => id === 'countries-fog'),
    ).toEqual({
      id: 'countries-fog',
      source: {
        type: 'geojson',
        data: '/countries-fog.geo.json',
        promoteId: 'A3',
      },
    })
    const fogLayer = mapInstances[0].addLayerCalls.find(
      ({ layer }) =>
        (layer as { id?: string }).id === 'unexplored-countries-fog',
    )
    expect(fogLayer).toMatchObject({
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
        fogLayer?.layer as {
          paint: { 'fill-opacity': unknown[] }
        }
      ).paint['fill-opacity'].slice(0, 3),
    ).toEqual(['interpolate', ['linear'], ['zoom']])
  })

  it('shows only country label layers fully from zoom 2', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas />)

    act(() => mapInstances[0].emit('load'))

    expect(mapInstances[0].setPaintPropertyCalls).toEqual([
      {
        layerId: 'label_country_3',
        property: 'text-opacity',
        value: ['step', ['zoom'], 0, 2, 1],
      },
      {
        layerId: 'label_country_2',
        property: 'text-opacity',
        value: ['step', ['zoom'], 0, 2, 1],
      },
      {
        layerId: 'label_country_1',
        property: 'text-opacity',
        value: ['step', ['zoom'], 0, 2, 1],
      },
    ])
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

  it('adds a clustered Discovery source and the world-dot layer', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas discoveries={[discoveryMarkerData]} />)
    act(() => mapInstances[0].emit('load'))

    const source = mapInstances[0].addSourceCalls.find(
      ({ id }) => id === 'sterna-discoveries',
    )?.source as {
      cluster: boolean
      clusterRadius: number
      clusterMaxZoom: number
      clusterProperties: Record<string, unknown>
    }
    expect(source).toMatchObject({
      cluster: true,
      clusterRadius: 40,
      clusterMaxZoom: 21,
      maxzoom: 22,
    })
    expect(Object.keys(source.clusterProperties)).toEqual([
      'landscapeCount',
      'monumentCount',
      'foodCount',
      'animalCount',
      'plantCount',
      'cultureCount',
      'otherCount',
    ])

    const dotLayer = mapInstances[0].addLayerCalls.find(
      ({ layer }) => (layer as { id?: string }).id === 'sterna-discovery-dots',
    )?.layer as { maxzoom?: number; filter: unknown }
    expect(dotLayer.filter).toEqual(['!', ['has', 'point_count']])
    expect(dotLayer.maxzoom).toBeUndefined()
  })

  it('updates Discovery source data without recreating the map', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const { rerender } = render(<MapCanvas discoveries={[]} />)
    act(() => mapInstances[0].emit('load'))
    const source = mapInstances[0].getSource('sterna-discoveries') as {
      setDataCalls: unknown[]
    }

    rerender(<MapCanvas discoveries={[discoveryMarkerData]} />)

    expect(mapInstances).toHaveLength(1)
    expect(source.setDataCalls).toHaveLength(1)
    expect(source.setDataCalls[0]).toMatchObject({
      features: [{ id: 1, properties: { category: 'landscape' } }],
    })
  })

  it('shows only unclustered individual Discovery markers', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas discoveries={[discoveryMarkerData]} />)
    const individualButton = markerInstances[0].element?.querySelector(
      '[aria-label="View Discovery"]',
    ) as HTMLElement
    expect(individualButton.parentElement?.style.display).toBe('none')

    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [unclusteredFeature(1)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    expect(individualButton.parentElement?.style.display).toBe('')
    const icon = individualButton.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-white')
    expect(icon?.getAttribute('class')).not.toContain('text-[#2563EB]')

    mapInstances[0].sourceFeatures = [clusterFeature(10)]
    act(() => mapInstances[0].emit('move'))
    await flushSpatialSync()

    expect(individualButton.parentElement?.style.display).toBe('none')
  })

  it('deduplicates cluster features returned at tile boundaries', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas />)
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [clusterFeature(10), clusterFeature(10)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    const clusters = markerInstances.filter((marker) =>
      marker.element?.querySelector('[aria-label="3 discoveries nearby"]'),
    )
    expect(clusters).toHaveLength(1)
    expect(clusters[0].opacityWhenCovered).toBe(0)
  })

  it('zooms a low-zoom cluster to its expansion zoom', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas initialViewport={{ center: [6, 46], zoom: 5 }} />)
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].clusterExpansionZoom = 8
    mapInstances[0].sourceFeatures = [clusterFeature(10)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    const button = markerInstances.at(-1)?.element?.querySelector('button')
    await act(async () => button?.click())

    expect(mapInstances[0].easeToCalls).toEqual([
      { center: [6, 46], zoom: 8, duration: 350 },
    ])
  })

  it('safely ignores a rejected stale cluster expansion lookup', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas initialViewport={{ center: [6, 46], zoom: 13 }} />)
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].clusterExpansionError = new Error('stale cluster')
    mapInstances[0].sourceFeatures = [clusterFeature(10)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    const button = markerInstances.at(-1)?.element?.querySelector('button')
    await act(async () => {
      button?.click()
      await Promise.resolve()
    })

    expect(mapInstances[0].easeToCalls).toEqual([])
  })

  it('keeps zooming a separable high-zoom cluster instead of opening a stack', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(<MapCanvas initialViewport={{ center: [6, 46], zoom: 13 }} />)
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].clusterExpansionZoom = 14
    mapInstances[0].sourceFeatures = [clusterFeature(10)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    const button = markerInstances.at(-1)?.element?.querySelector('button')
    await act(async () => button?.click())

    expect(mapInstances[0].easeToCalls).toEqual([
      { center: [6, 46], zoom: 14, duration: 350 },
    ])
    expect(document.body).not.toHaveTextContent('3 discoveries nearby')
  })

  it('opens a high-zoom same-place stack using current Discovery data', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    const secondDiscovery = {
      ...discoveryMarkerData,
      id: 2,
      name: 'Second discovery',
    }
    const thirdDiscovery = {
      ...discoveryMarkerData,
      id: 3,
      name: 'Third discovery',
    }

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 13 }}
        discoveries={[discoveryMarkerData, secondDiscovery, thirdDiscovery]}
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].clusterExpansionZoom = 17
    mapInstances[0].clusterLeaves = [
      unclusteredFeature(1),
      unclusteredFeature(2),
      unclusteredFeature(3),
    ]
    mapInstances[0].sourceFeatures = [clusterFeature(10, 3)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()
    await waitFor(() =>
      expect(
        markerInstances
          .at(-1)
          ?.element?.querySelector('[aria-label="Open 3 nearby discoveries"]'),
      ).not.toBeNull(),
    )

    const stackButton = markerInstances
      .at(-1)
      ?.element?.querySelector(
        '[aria-label="Open 3 nearby discoveries"]',
      ) as HTMLButtonElement
    expect(stackButton).not.toBeNull()

    await act(async () => stackButton.click())

    expect(mapInstances[0].easeToCalls).toEqual([])
    expect(document.body).toHaveTextContent('3 discoveries nearby')
    expect(document.body).toHaveTextContent('Second discovery')
    expect(document.body).toHaveTextContent('Third discovery')
  })

  it('selects the only valid cluster leaf after a concurrent data change', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    const onSelectDiscovery = vi.fn()

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 13 }}
        discoveries={[discoveryMarkerData]}
        onSelectDiscovery={onSelectDiscovery}
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].clusterExpansionZoom = 17
    mapInstances[0].clusterLeaves = [
      unclusteredFeature(1),
      unclusteredFeature(999),
    ]
    mapInstances[0].sourceFeatures = [clusterFeature(10, 2)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()
    await waitFor(() =>
      expect(
        markerInstances
          .at(-1)
          ?.element?.querySelector('[aria-label="Open 2 nearby discoveries"]'),
      ).not.toBeNull(),
    )

    const stackButton = markerInstances
      .at(-1)
      ?.element?.querySelector('button') as HTMLButtonElement
    await act(async () => stackButton.click())

    expect(onSelectDiscovery).toHaveBeenCalledWith(1)
    expect(document.body).not.toHaveTextContent('1 discoveries nearby')
  })

  it('loads only visible unclustered map thumbnails at the photo morph zoom', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    getPhotoMock.mockReturnValue(new Promise(() => undefined))

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 11.5 }}
        discoveries={[discoveryMarkerData]}
        photoAccessToken="token"
      />,
    )
    expect(getPhotoMock).not.toHaveBeenCalled()

    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [unclusteredFeature(1)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    expect(getPhotoMock).toHaveBeenCalledWith(
      'token',
      'photos/example.jpg',
      'map',
    )
    expect(getPhotoMock.mock.calls.every((call) => call[2] === 'map')).toBe(
      true,
    )
  })

  it('does not request a map thumbnail below zoom 11.5', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 10 }}
        discoveries={[discoveryMarkerData]}
        photoAccessToken="token"
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [unclusteredFeature(1)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    expect(getPhotoMock).not.toHaveBeenCalled()
  })

  it('does not load an individual thumbnail while it is clustered', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 11.5 }}
        discoveries={[discoveryMarkerData]}
        photoAccessToken="token"
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [clusterFeature(10)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    expect(getPhotoMock).not.toHaveBeenCalled()
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

  it('morphs an isolated loaded Discovery marker into a photo', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:map-photo')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const originalDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = vi.fn().mockResolvedValue(undefined)

    const view = render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 12.8 }}
        discoveries={[discoveryMarkerData]}
        photoAccessToken="token"
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [unclusteredFeature(1)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    const [marker] = markerInstances
    const visual = marker.element?.querySelector(
      '[data-discovery-visual]',
    ) as HTMLElement
    const photo = marker.element?.querySelector(
      '[data-discovery-photo]',
    ) as HTMLElement
    await waitFor(() => expect(visual.style.width).toBe('56px'))
    expect(visual.style.width).toBe('56px')
    expect(visual.style.borderRadius).toBe('12px')
    expect(photo.style.backgroundImage).toContain('blob:map-photo')
    expect(photo.style.opacity).toBe('1')

    view.unmount()
    if (originalDecode) HTMLImageElement.prototype.decode = originalDecode
    else delete (HTMLImageElement.prototype as { decode?: unknown }).decode
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

  it('keeps the category marker usable when map photo decoding fails', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:broken-map-photo')
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    const originalDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = vi
      .fn()
      .mockRejectedValue(new Error('decode failed'))

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 12.8 }}
        discoveries={[discoveryMarkerData]}
        photoAccessToken="token"
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [unclusteredFeature(1)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()
    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:broken-map-photo'),
    )

    const [marker] = markerInstances
    const button = marker.element?.querySelector(
      '[aria-label="View Discovery"]',
    )
    const photo = marker.element?.querySelector(
      '[data-discovery-photo]',
    ) as HTMLElement
    expect(button).not.toBeNull()
    expect(photo.style.opacity).toBe('0')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:broken-map-photo')

    if (originalDecode) HTMLImageElement.prototype.decode = originalDecode
    else delete (HTMLImageElement.prototype as { decode?: unknown }).decode
  })

  it('revokes a loaded map thumbnail URL on cleanup', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cleanup-map-photo')
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    const originalDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = vi.fn().mockResolvedValue(undefined)

    const view = render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 12.8 }}
        discoveries={[discoveryMarkerData]}
        photoAccessToken="token"
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [unclusteredFeature(1)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()
    await waitFor(() =>
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob)),
    )

    view.unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cleanup-map-photo')
    if (originalDecode) HTMLImageElement.prototype.decode = originalDecode
    else delete (HTMLImageElement.prototype as { decode?: unknown }).decode
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

    // Same arithmetic as poiMarkerScaleForZoom(5) in the source, so this stays
    // exact without duplicating (and risking transcribing wrong) its output.
    const expectedScale = 0.35 + ((5 - 1.5) / (6 - 1.5)) * (1 - 0.35)
    expect(scaledElement.style.transform).toBe(`scale(${expectedScale})`)
  })

  it('preloads a map thumbnail at zoom 10.8 before the visual morph begins', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })
    getPhotoMock.mockReturnValue(new Promise(() => undefined))

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 10.8 }}
        discoveries={[discoveryMarkerData]}
        photoAccessToken="token"
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [unclusteredFeature(1)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    expect(getPhotoMock).toHaveBeenCalledWith(
      'token',
      'photos/example.jpg',
      'map',
    )
  })

  it('keeps 3 identical-location discoveries clustered at max zoom 20', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const identicalDiscoveries = [
      {
        id: 1,
        name: 'D1',
        category: 'plant' as const,
        imageId: '1',
        coordinates: [6, 46] as [number, number],
      },
      {
        id: 2,
        name: 'D2',
        category: 'plant' as const,
        imageId: '2',
        coordinates: [6, 46] as [number, number],
      },
      {
        id: 3,
        name: 'D3',
        category: 'plant' as const,
        imageId: '3',
        coordinates: [6, 46] as [number, number],
      },
    ]

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 20 }}
        discoveries={identicalDiscoveries}
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].clusterExpansionZoom = 21
    mapInstances[0].sourceFeatures = [clusterFeature(10)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    const clusters = markerInstances.filter((marker) =>
      marker.element?.querySelector('[aria-label="Open 3 nearby discoveries"]'),
    )
    expect(clusters).toHaveLength(1)

    // All 3 individual markers remain hidden
    for (const marker of markerInstances) {
      if (marker !== clusters[0]) {
        expect(marker.element?.style.display).toBe('none')
      }
    }
  })

  it('prevents flicker from stack back to normal cluster on subsequent move/sync', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 14 }}
        discoveries={[discoveryMarkerData]}
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].clusterExpansionZoom = 16
    mapInstances[0].sourceFeatures = [clusterFeature(10)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    const clusterMarker = markerInstances.find((m) =>
      m.element?.querySelector('[aria-label="Open 3 nearby discoveries"]'),
    )
    expect(clusterMarker).toBeDefined()

    const stackVisual = clusterMarker?.element?.querySelector(
      'span[class*="transition-[opacity,transform]"]',
    ) as HTMLElement
    const normalVisual = clusterMarker?.element?.querySelector(
      'span[class*="rounded-full"]',
    ) as HTMLElement

    expect(stackVisual.style.display).toBe('')
    expect(normalVisual.style.display).toBe('none')

    // Trigger another move at same zoom
    act(() => mapInstances[0].emit('move'))
    await flushSpatialSync()

    // Must remain stack continuously without resetting to normal cluster
    expect(stackVisual.style.display).toBe('')
    expect(normalVisual.style.display).toBe('none')
  })

  it('preserves marker identity for unchanged discoveries and does not recreate POI markers', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const initialDiscoveries = [
      {
        id: 1,
        name: 'D1',
        category: 'plant' as const,
        imageId: '1',
        coordinates: [6, 46] as [number, number],
      },
      {
        id: 2,
        name: 'D2',
        category: 'plant' as const,
        imageId: '2',
        coordinates: [6.1, 46.1] as [number, number],
      },
    ]
    const initialLandmarks = [
      {
        id: 'poi-1',
        name: 'POI 1',
        imageId: 'poi',
        discovered: true,
        coordinates: [6, 46] as [number, number],
      },
    ]

    const { rerender } = render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 5 }}
        discoveries={initialDiscoveries}
        landmarks={initialLandmarks}
      />,
    )

    // Initially: 2 discovery markers + 1 POI marker
    expect(markerInstances).toHaveLength(3)
    const discoveryMarker1 = markerInstances[0]
    const discoveryMarker2 = markerInstances[1]
    const poiMarker = markerInstances[2]

    // Update discoveries: remove D2, keep D1 unchanged, add D3
    const updatedDiscoveries = [
      {
        id: 1,
        name: 'D1',
        category: 'plant' as const,
        imageId: '1',
        coordinates: [6, 46] as [number, number],
      },
      {
        id: 3,
        name: 'D3',
        category: 'plant' as const,
        imageId: '3',
        coordinates: [6.2, 46.2] as [number, number],
      },
    ]

    rerender(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 5 }}
        discoveries={updatedDiscoveries}
        landmarks={initialLandmarks}
      />,
    )

    // D1 marker was preserved
    expect(discoveryMarker1.removed).toBe(false)
    // D2 marker was removed
    expect(discoveryMarker2.removed).toBe(true)
    // POI marker was NOT removed or recreated
    expect(poiMarker.removed).toBe(false)
    // Exactly one new marker was created for D3
    expect(markerInstances).toHaveLength(4)
    expect(markerInstances[3].removed).toBe(false)
  })

  it('reconciles POI markers: preserves unchanged POI identity, updates false -> true discovered appearance, and updates coordinates', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const initialLandmarks = [
      {
        id: 'poi-1',
        name: 'POI 1',
        imageId: 'poi1',
        discovered: false,
        coordinates: [6, 46] as [number, number],
      },
      {
        id: 'poi-2',
        name: 'POI 2',
        imageId: 'poi2',
        discovered: false,
        coordinates: [7, 47] as [number, number],
      },
    ]

    const { rerender } = render(
      <MapCanvas
        initialViewport={{ center: [6.5, 46.5], zoom: 6 }}
        landmarks={initialLandmarks}
      />,
    )

    expect(markerInstances).toHaveLength(2)
    const poi1Marker = markerInstances[0]
    const poi2Marker = markerInstances[1]

    expect(poi1Marker.element?.querySelector('span.grayscale')).not.toBeNull()
    expect(poi1Marker.element?.textContent).toContain('Undiscovered')

    // Rerender: POI 1 becomes discovered (visual change), POI 2 moves (coordinates change)
    const updatedLandmarks = [
      {
        id: 'poi-1',
        name: 'POI 1',
        imageId: 'poi1',
        discovered: true,
        coordinates: [6, 46] as [number, number],
      },
      {
        id: 'poi-2',
        name: 'POI 2',
        imageId: 'poi2',
        discovered: false,
        coordinates: [7.5, 47.5] as [number, number],
      },
    ]

    rerender(
      <MapCanvas
        initialViewport={{ center: [6.5, 46.5], zoom: 6 }}
        landmarks={updatedLandmarks}
      />,
    )

    // POI 1 marker was replaced with discovered presentation
    expect(poi1Marker.removed).toBe(true)
    const newPoi1Marker = markerInstances.find(
      (m) => m !== poi1Marker && m !== poi2Marker,
    )
    expect(newPoi1Marker).toBeDefined()
    expect(newPoi1Marker?.element?.querySelector('span.grayscale')).toBeNull()
    expect(newPoi1Marker?.element?.textContent).toContain('Discovered')

    // POI 2 marker instance was preserved, not removed
    expect(poi2Marker.removed).toBe(false)
    expect(poi2Marker.coordinates).toEqual([7.5, 47.5])
  })

  it('prevents stale photo request race from overwriting a newer imageObjectKey', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    let resolveOldPhoto!: (blob: Blob) => void
    let resolveNewPhoto!: (blob: Blob) => void

    getPhotoMock.mockImplementation((_token, key) => {
      if (key === 'photos/old.jpg') {
        return new Promise<Blob>((resolve) => {
          resolveOldPhoto = resolve
        })
      }
      return new Promise<Blob>((resolve) => {
        resolveNewPhoto = resolve
      })
    })

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((obj: Blob | MediaSource) => {
        return (obj as { _name?: string })._name ?? 'blob:default'
      })
    const originalDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = vi.fn().mockResolvedValue(undefined)

    const initialDiscovery: DiscoveryMarkerData = {
      id: 42,
      name: 'Old Discovery',
      category: 'plant',
      imageId: 'old',
      imageObjectKey: 'photos/old.jpg',
      coordinates: [6, 46],
    }

    const { rerender } = render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 12.8 }}
        discoveries={[initialDiscovery]}
        photoAccessToken="token"
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].sourceFeatures = [unclusteredFeature(42)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    expect(getPhotoMock).toHaveBeenCalledWith('token', 'photos/old.jpg', 'map')

    // Update discovery with new imageObjectKey before old request resolves
    const updatedDiscovery: DiscoveryMarkerData = {
      ...initialDiscovery,
      imageObjectKey: 'photos/new.jpg',
    }

    rerender(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 12.8 }}
        discoveries={[updatedDiscovery]}
        photoAccessToken="token"
      />,
    )
    await flushSpatialSync()

    expect(getPhotoMock).toHaveBeenCalledWith('token', 'photos/new.jpg', 'map')

    // Now resolve the old request
    const oldBlob = new Blob(['old'])
    Object.assign(oldBlob, { _name: 'blob:old-photo' })
    await act(async () => {
      resolveOldPhoto(oldBlob)
      await flushSpatialSync()
    })

    const marker = markerInstances.find((m) =>
      m.element?.querySelector('button[aria-label="View Old Discovery"]'),
    )
    const photoSpan = marker?.element?.querySelector(
      '[data-discovery-photo]',
    ) as HTMLElement
    // Stale old photo must not be painted
    expect(photoSpan.style.backgroundImage).not.toContain('blob:old-photo')

    // Now resolve the new request
    const newBlob = new Blob(['new'])
    Object.assign(newBlob, { _name: 'blob:new-photo' })
    await act(async () => {
      resolveNewPhoto(newBlob)
      await flushSpatialSync()
    })

    // Authoritative new photo is applied
    expect(photoSpan.style.backgroundImage).toBe('url("blob:new-photo")')

    if (originalDecode) HTMLImageElement.prototype.decode = originalDecode
    else delete (HTMLImageElement.prototype as { decode?: unknown }).decode
    createObjectURLSpy.mockRestore()
  })

  it('invalidates HTML cluster markers and revokes URLs when Discovery dataset changes', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'test-browser',
    })

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:cluster-representative-1')
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    const originalDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = vi.fn().mockResolvedValue(undefined)

    const datasetA = [
      {
        id: 1,
        name: 'A1',
        category: 'plant' as const,
        imageId: '1',
        imageObjectKey: 'photos/1.jpg',
        coordinates: [6, 46] as [number, number],
      },
      {
        id: 2,
        name: 'A2',
        category: 'plant' as const,
        imageId: '2',
        imageObjectKey: 'photos/2.jpg',
        coordinates: [6, 46] as [number, number],
      },
    ]

    const { rerender } = render(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 14 }}
        discoveries={datasetA}
        photoAccessToken="token"
      />,
    )
    act(() => mapInstances[0].emit('load'))
    mapInstances[0].clusterExpansionZoom = 16
    mapInstances[0].clusterLeaves = [
      unclusteredFeature(1),
      unclusteredFeature(2),
    ]
    mapInstances[0].sourceFeatures = [clusterFeature(5, 2)]
    act(() =>
      mapInstances[0].emit('sourcedata', { sourceId: 'sterna-discoveries' }),
    )
    await flushSpatialSync()

    const oldClusterMarker = markerInstances.find((m) =>
      m.element?.querySelector('[aria-label="Open 2 nearby discoveries"]'),
    )
    expect(oldClusterMarker).toBeDefined()
    expect(oldClusterMarker?.removed).toBe(false)

    // Dataset B with different discoveries
    const datasetB = [
      {
        id: 10,
        name: 'B1',
        category: 'monument' as const,
        imageId: '10',
        coordinates: [20, 20] as [number, number],
      },
    ]

    rerender(
      <MapCanvas
        initialViewport={{ center: [6, 46], zoom: 14 }}
        discoveries={datasetB}
        photoAccessToken="token"
      />,
    )

    // Old cluster marker must be removed and its object URL revoked
    expect(oldClusterMarker?.removed).toBe(true)
    expect(revokeObjectURL).toHaveBeenCalledWith(
      'blob:cluster-representative-1',
    )

    if (originalDecode) HTMLImageElement.prototype.decode = originalDecode
    else delete (HTMLImageElement.prototype as { decode?: unknown }).decode
    createObjectURLSpy.mockRestore()
    revokeObjectURL.mockRestore()
  })
})
