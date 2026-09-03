import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Map, Marker, setWorkerUrl } from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryClusterSheet } from '@/components/DiscoveryClusterSheet'
import { getPhoto } from '@/lib/api'
import {
  DISCOVERY_CLUSTER_MAX_ZOOM,
  DISCOVERY_CLUSTER_PROPERTIES,
  DISCOVERY_CLUSTER_RADIUS,
  DISCOVERY_DOT_END_ZOOM,
  DISCOVERY_DOT_LAYER_ID,
  DISCOVERY_MAP_COLOR_EXPRESSION,
  DISCOVERY_PHOTO_PRELOAD_ZOOM,
  DISCOVERY_SOURCE_ID,
  DISCOVERY_SOURCE_MAX_ZOOM,
  DISCOVERY_STACK_EXPANSION_ZOOM,
  DISCOVERY_STACK_MIN_ZOOM,
  getDiscoveryClusterGradient,
  getDiscoveryMapColor,
  getDiscoveryMarkerVisual,
  toDiscoveryFeatureCollection,
} from '@/lib/discovery-map-markers'
import {
  defaultGlobeViewport,
  getStoredMapViewport,
  getResponsiveGlobeMinimumZoom,
  saveMapViewport,
  type MapViewport,
} from '@/lib/map-viewport'
import {
  getVisibleLandmarks,
  isCoordinateInMapViewport,
} from '@/lib/map-markers'
import { type DiscoveryCategory } from '@/lib/mock-data'
import {
  fogColor,
  fogLayerId,
  fogMaxZoom,
  fogOpacityExpression,
  fogSourceId,
  getFogInsertionBeforeLayerId,
} from '@/lib/map-fog'
import { getPoiImageUrl } from '@/lib/poi-image'

setWorkerUrl(maplibreWorkerUrl)

const mapStyle = 'https://tiles.openfreemap.org/styles/bright'
const countryLabelOpacityExpression: ExpressionSpecification = [
  'step',
  ['zoom'],
  0,
  2,
  1,
]

function applyCountryLabelOpacity(instance: Map): void {
  for (const layer of instance.getStyle()?.layers ?? []) {
    const isCountryLabel =
      layer.type === 'symbol' &&
      layer['source-layer'] === 'place' &&
      layer.id.match(/(^|[-_])country([-_]|$)/i) &&
      layer.layout?.['text-field']

    if (!isCountryLabel) continue

    try {
      instance.setPaintProperty(
        layer.id,
        'text-opacity',
        countryLabelOpacityExpression,
      )
    } catch {
      // Leave style layers unchanged when text-opacity is not supported.
    }
  }
}

// Zoom level below which POI markers are hidden. Around whole-country level
// (~5) so pins stay visible while browsing a country, and only disappear once
// zoomed out to a continent/world view where they'd overlap and clutter.
const landmarkMinZoom = 5
// Marker scaling stays anchored to the original globe zoom reference even
// though MapLibre's responsive minimum can now vary with the screen size.
const markerScaleReferenceZoom = 1.5
// POI pins shrink continuously between the most zoomed-out globe
// view and country level, so a full world view isn't dominated by full-size
// pins, reaching full size by the time browsing a single country.
const markerMinScale = 0.35
const markerScaleMaxZoom = 6

function poiMarkerScaleForZoom(zoom: number): number {
  const t =
    (zoom - markerScaleReferenceZoom) /
    (markerScaleMaxZoom - markerScaleReferenceZoom)
  return markerMinScale + Math.min(Math.max(t, 0), 1) * (1 - markerMinScale)
}

// The semantic country dataset gives two genuinely disputed areas their own
// feature instead of folding them into either claim's polygon — XCR (Crimea,
// claimed by RUS and UKR) and XWS (the Morocco/Western-Sahara overlap, MAR and
// ESH).
// Neither claim is favoured: the shared zone's veil lifts the moment either
// side of the dispute is explored.
const disputedZoneClaims: Record<string, string[]> = {
  XCR: ['RUS', 'UKR'],
  XWS: ['MAR', 'ESH'],
}

export interface MapCanvasHandle {
  locate: (coordinates: [number, number]) => void
  resize: () => void
  flyTo: (coordinates: [number, number], zoom?: number) => void
  resetNorth: () => void
}

export interface DiscoveryMarkerData {
  id: number
  name: string
  category: DiscoveryCategory
  imageId: string
  imageObjectKey?: string
  coordinates: [number, number]
}

export interface LandmarkMarkerData {
  id: string
  name: string
  imageId: string
  imageUrl?: string
  discovered: boolean
  coordinates: [number, number]
}

interface MapCanvasProps {
  initialViewport?: MapViewport
  discoveries?: DiscoveryMarkerData[]
  landmarks?: LandmarkMarkerData[]
  exploredCountryCodes?: string[]
  userLocation?: [number, number]
  onSelectDiscovery?: (id: number) => void
  onSelectLandmark?: (id: string) => void
  photoAccessToken?: string
}

type PhotoLoadState = 'idle' | 'loading' | 'loaded' | 'error'

interface DiscoveryMarkerEntry {
  marker: Marker
  markerHost: HTMLDivElement
  button: HTMLButtonElement
  visual: HTMLSpanElement
  colorLayer: HTMLSpanElement
  iconLayer: HTMLSpanElement
  photoLayer: HTMLSpanElement
  iconRoot: Root
  discovery: DiscoveryMarkerData
  photoState: PhotoLoadState
  photoRequestGeneration: number
  objectUrl?: string
}

interface LandmarkMarkerEntry {
  data: LandmarkMarkerData
  marker: Marker
  root: Root
  scaledElement: { current: HTMLElement | null }
}

interface ClusterFeature {
  geometry: {
    type: string
    coordinates: [number, number]
  }
  properties: Record<string, unknown>
}

interface ClusterMarkerEntry {
  marker: Marker
  button: HTMLButtonElement
  normalVisual: HTMLSpanElement
  countLabel: HTMLSpanElement
  stackVisual: HTMLSpanElement
  stackFront: HTMLSpanElement
  stackCount: HTMLSpanElement
  coordinates: [number, number]
  pointCount: number
  feature: ClusterFeature
  isStack: boolean
  stackEligibility: 'unknown' | 'normal' | 'stack'
  representativePhotoState: PhotoLoadState
  representativeObjectUrl?: string
}

const discoveryCategories: DiscoveryCategory[] = [
  'landscape',
  'monument',
  'food',
  'animal',
  'plant',
  'culture',
  'other',
]

function getClusterColor(feature: ClusterFeature, pointCount: number): string {
  const homogeneousCategory = discoveryCategories.find(
    (category) =>
      Number(feature.properties[`${category}Count`] ?? 0) === pointCount,
  )

  return homogeneousCategory
    ? getDiscoveryMapColor(homogeneousCategory)
    : getDiscoveryMapColor('other')
}

function applyDiscoveryMarkerVisual(
  entry: DiscoveryMarkerEntry,
  zoom: number,
): void {
  const visual = getDiscoveryMarkerVisual(zoom, entry.photoState === 'loaded')

  entry.visual.style.width = `${visual.size}px`
  entry.visual.style.height = `${visual.size}px`
  entry.visual.style.borderRadius = `${visual.borderRadius}px`
  entry.visual.style.borderWidth = `${visual.borderWidth}px`
  entry.visual.style.opacity = `${visual.domOpacity}`
  entry.colorLayer.style.opacity = `${visual.colorOpacity}`
  entry.iconLayer.style.opacity = `${visual.iconOpacity}`
  entry.photoLayer.style.opacity = `${visual.photoOpacity}`
}

function clusterVisualSize(pointCount: number): number {
  if (pointCount >= 100) return 38
  if (pointCount >= 10) return 34
  return 30
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      discoveries = [],
      landmarks = [],
      exploredCountryCodes = [],
      userLocation,
      onSelectDiscovery,
      onSelectLandmark,
      photoAccessToken,
      initialViewport,
    },
    ref,
  ) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<Map | null>(null)
    const initialViewportRef = useRef(initialViewport)
    const discoveriesRef = useRef(discoveries)
    discoveriesRef.current = discoveries
    const landmarksRef = useRef(landmarks)
    landmarksRef.current = landmarks
    const onSelectDiscoveryRef = useRef(onSelectDiscovery)
    onSelectDiscoveryRef.current = onSelectDiscovery
    const onSelectLandmarkRef = useRef(onSelectLandmark)
    onSelectLandmarkRef.current = onSelectLandmark
    const photoAccessTokenRef = useRef(photoAccessToken)
    photoAccessTokenRef.current = photoAccessToken

    const reconcileDiscoveriesRef = useRef<
      ((next: DiscoveryMarkerData[]) => void) | null
    >(null)
    const updateLandmarksRef = useRef<(() => void) | null>(null)
    const syncSpatialRef = useRef<(() => void) | null>(null)

    const [clusterSheetDiscoveries, setClusterSheetDiscoveries] = useState<
      DiscoveryMarkerData[]
    >([])
    const pendingTarget = useRef<{
      coordinates: [number, number]
      zoom: number
    } | null>(null)
    const exploredCodes = useRef<string[]>(exploredCountryCodes)
    const appliedCodes = useRef<Set<string>>(new Set())
    const applyExploredStatesRef = useRef<() => void>(() => {})

    useImperativeHandle(ref, () => ({
      locate: (coordinates) => {
        const instance = map.current
        const zoom = Math.max(instance?.getZoom() ?? 13, 13)
        if (instance) {
          instance.flyTo({ center: coordinates, zoom })
        } else {
          pendingTarget.current = { coordinates, zoom }
        }
      },
      resize: () => map.current?.resize(),
      flyTo: (coordinates, zoom = 15) => {
        if (map.current) {
          map.current.flyTo({ center: coordinates, zoom })
        } else {
          pendingTarget.current = { coordinates, zoom }
        }
      },
      // Rotate/tilt back to north-up, 0° pitch — the "basic view" orientation,
      // independent of the globe/mercator projection switch.
      resetNorth: () => map.current?.resetNorthPitch(),
    }))

    useEffect(() => {
      if (!mapContainer.current || navigator.userAgent.includes('jsdom')) {
        return
      }

      const viewport =
        initialViewportRef.current ??
        getStoredMapViewport() ??
        defaultGlobeViewport
      const instance = new Map({
        container: mapContainer.current,
        style: mapStyle,
        center: viewport.center,
        zoom: viewport.zoom,
      })

      const updateMinimumZoom = () => {
        const minimumZoom = getResponsiveGlobeMinimumZoom(instance)
        if (minimumZoom === null) return

        instance.setMinZoom(minimumZoom)
        if (instance.getZoom() < minimumZoom) {
          instance.setZoom(minimumZoom)
        }
      }

      updateMinimumZoom()
      const resizeObserver =
        typeof ResizeObserver === 'function'
          ? new ResizeObserver(updateMinimumZoom)
          : null
      resizeObserver?.observe(mapContainer.current)

      const saveCurrentViewport = () => {
        const center = instance.getCenter()
        saveMapViewport({
          center: [center.lng, center.lat],
          zoom: instance.getZoom(),
        })
      }

      instance.on('moveend', saveCurrentViewport)
      instance.on('zoomend', saveCurrentViewport)

      const applyExploredStates = () => {
        if (!instance.getSource(fogSourceId)) {
          return
        }
        const codes = new Set(exploredCodes.current)
        for (const [zone, claims] of Object.entries(disputedZoneClaims)) {
          if (claims.some((code) => codes.has(code))) {
            codes.add(zone)
          }
        }
        for (const code of codes) {
          if (!appliedCodes.current.has(code)) {
            instance.setFeatureState(
              { source: fogSourceId, id: code },
              { explored: true },
            )
          }
        }
        for (const code of appliedCodes.current) {
          if (!codes.has(code)) {
            instance.setFeatureState(
              { source: fogSourceId, id: code },
              { explored: false },
            )
          }
        }
        appliedCodes.current = codes
      }
      applyExploredStatesRef.current = applyExploredStates

      instance.on('load', () => {
        // Renders as a globe when zoomed out to see the whole world.
        // MapLibre animates its own switch back to the flat mercator map
        // around zoom 12, where globe curvature would otherwise hurt
        // precision — no manual zoom threshold needed here.
        instance.setProjection({ type: 'globe' })
        applyCountryLabelOpacity(instance)

        instance.addSource(DISCOVERY_SOURCE_ID, {
          type: 'geojson',
          data: toDiscoveryFeatureCollection(discoveriesRef.current),
          maxzoom: DISCOVERY_SOURCE_MAX_ZOOM,
          cluster: true,
          clusterRadius: DISCOVERY_CLUSTER_RADIUS,
          clusterMaxZoom: DISCOVERY_CLUSTER_MAX_ZOOM,
          clusterProperties: DISCOVERY_CLUSTER_PROPERTIES as unknown as Record<
            string,
            ExpressionSpecification
          >,
        })

        instance.addLayer({
          id: DISCOVERY_DOT_LAYER_ID,
          type: 'circle',
          source: DISCOVERY_SOURCE_ID,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color':
              DISCOVERY_MAP_COLOR_EXPRESSION as unknown as ExpressionSpecification,
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              3.3,
              4,
              DISCOVERY_DOT_END_ZOOM,
              4,
              4.8,
              7,
            ],
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              DISCOVERY_DOT_END_ZOOM,
              1,
              4.8,
              0,
            ],
            'circle-stroke-color': '#F7F5F0',
            'circle-stroke-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              DISCOVERY_DOT_END_ZOOM,
              1,
              4.8,
              0,
            ],
            'circle-stroke-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              DISCOVERY_DOT_END_ZOOM,
              1,
              4.8,
              0,
            ],
          },
        })

        instance.addSource(fogSourceId, {
          type: 'geojson',
          data: '/countries-fog.geo.json',
          promoteId: 'A3',
        })

        // Put the veil below OpenFreeMap's own administrative boundaries and
        // labels. Their geometry is the same source as the basemap, so it
        // remains aligned when the simplified Sterna fog asset does not.
        const fogBeforeLayerId = getFogInsertionBeforeLayerId(
          instance.getStyle()?.layers ?? [],
        )

        instance.addLayer(
          {
            id: fogLayerId,
            type: 'fill',
            source: fogSourceId,
            maxzoom: fogMaxZoom,
            paint: {
              'fill-color': fogColor,
              'fill-opacity': fogOpacityExpression,
            },
          },
          fogBeforeLayerId,
        )

        const onSourceData = () => {
          if (!instance.isSourceLoaded(fogSourceId)) {
            return
          }
          instance.off('sourcedata', onSourceData)
          applyExploredStates()
        }
        instance.on('sourcedata', onSourceData)
      })

      map.current = instance
      if (pendingTarget.current) {
        instance.flyTo({
          center: pendingTarget.current.coordinates,
          zoom: pendingTarget.current.zoom,
        })
        pendingTarget.current = null
      }

      const markers = new Set<Marker>()
      const roots = new Set<Root>()
      const discoveryMarkers = new globalThis.Map<
        number,
        DiscoveryMarkerEntry
      >()
      const clusterMarkers = new globalThis.Map<number, ClusterMarkerEntry>()
      const clusterExpansionZooms = new globalThis.Map<number, number>()
      const pendingClusterExpansionZooms = new globalThis.Map<
        number,
        Promise<number>
      >()
      const landmarkMarkers = new globalThis.Map<string, LandmarkMarkerEntry>()
      const scaledMarkerElements = new Set<HTMLElement>()
      let discoveryGeneration = 0
      let active = true
      let spatialFrame: number | null = null

      const disposeRoot = (root: Root) => {
        if (!roots.delete(root)) return
        queueMicrotask(() => root.unmount())
      }

      const removeMarker = (marker: Marker, root?: Root) => {
        marker.remove()
        markers.delete(marker)
        if (root) disposeRoot(root)
      }

      const updatePoiMarkerScale = () => {
        const scale = poiMarkerScaleForZoom(instance.getZoom())
        for (const el of scaledMarkerElements) {
          el.style.transform = `scale(${scale})`
        }
      }

      const createLandmarkMarker = (landmark: LandmarkMarkerData) => {
        const el = document.createElement('div')
        const root = createRoot(el)
        const markerImage = getPoiImageUrl(
          landmark.imageUrl,
          landmark.imageId,
          'map',
        )
        const scaledElement: { current: HTMLElement | null } = {
          current: null,
        }
        root.render(
          <button
            type="button"
            aria-label={`View ${landmark.name}`}
            className="relative size-11"
            onClick={() => onSelectLandmarkRef.current?.(landmark.id)}
          >
            <span
              ref={(node) => {
                if (!node) return
                node.style.transform = `scale(${poiMarkerScaleForZoom(instance.getZoom())})`
                scaledElement.current = node
                scaledMarkerElements.add(node)
              }}
              className={`absolute inset-0 overflow-hidden rounded-full border-2 shadow-lg ${landmark.discovered ? 'border-[#EAB308]' : 'border-white bg-stone-400 grayscale'}`}
            >
              <img
                src={markerImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full scale-125 object-cover opacity-55 blur-sm"
              />
              <img
                src={markerImage}
                alt=""
                className={`relative size-full object-cover ${landmark.discovered ? '' : 'opacity-70'}`}
              />
            </span>
            <span className="sr-only">
              {landmark.discovered ? 'Discovered' : 'Undiscovered'}
            </span>
          </button>,
        )

        const marker = new Marker({ element: el, opacityWhenCovered: 0 })
          .setLngLat(landmark.coordinates)
          .addTo(instance)
        markers.add(marker)
        roots.add(root)
        landmarkMarkers.set(landmark.id, {
          data: landmark,
          marker,
          root,
          scaledElement,
        })
      }

      const removeLandmarkMarker = (id: string) => {
        const entry = landmarkMarkers.get(id)
        if (!entry) return
        if (entry.scaledElement.current) {
          scaledMarkerElements.delete(entry.scaledElement.current)
        }
        removeMarker(entry.marker, entry.root)
        landmarkMarkers.delete(id)
      }

      const updateLandmarkMarkers = () => {
        if (instance.getZoom() < landmarkMinZoom) {
          for (const id of [...landmarkMarkers.keys()]) {
            removeLandmarkMarker(id)
          }
          return
        }

        const visibleLandmarks = getVisibleLandmarks(
          landmarksRef.current,
          instance.getBounds(),
        )
        const visibleIds = new Set(
          visibleLandmarks.map((landmark) => landmark.id),
        )

        for (const id of [...landmarkMarkers.keys()]) {
          if (!visibleIds.has(id)) removeLandmarkMarker(id)
        }

        for (const landmark of visibleLandmarks) {
          const existing = landmarkMarkers.get(landmark.id)
          if (!existing) {
            createLandmarkMarker(landmark)
          } else {
            const prev = existing.data
            const coordinatesChanged =
              prev.coordinates[0] !== landmark.coordinates[0] ||
              prev.coordinates[1] !== landmark.coordinates[1]
            const visualChanged =
              prev.name !== landmark.name ||
              prev.discovered !== landmark.discovered ||
              prev.imageId !== landmark.imageId ||
              prev.imageUrl !== landmark.imageUrl

            if (visualChanged) {
              removeLandmarkMarker(landmark.id)
              createLandmarkMarker(landmark)
            } else if (coordinatesChanged) {
              existing.marker.setLngLat(landmark.coordinates)
              existing.data = landmark
            }
          }
        }
      }

      const createDiscoveryMarker = (discovery: DiscoveryMarkerData) => {
        const markerHost = document.createElement('div')
        markerHost.style.display = 'none'

        const button = document.createElement('button')
        button.type = 'button'
        button.setAttribute('aria-label', `View ${discovery.name}`)
        button.className = 'relative size-11'
        button.addEventListener('click', () =>
          onSelectDiscoveryRef.current?.(discovery.id),
        )

        const visual = document.createElement('span')
        visual.dataset.discoveryVisual = ''
        visual.className =
          'absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 overflow-hidden border-[#F7F5F0] shadow-[0_2px_7px_rgba(28,25,23,0.22)]'

        const colorLayer = document.createElement('span')
        colorLayer.className = 'absolute inset-0'
        colorLayer.style.backgroundColor = getDiscoveryMapColor(
          discovery.category,
        )

        const iconLayer = document.createElement('span')
        iconLayer.className =
          'absolute inset-[6px] flex items-center justify-center'
        const iconHost = document.createElement('span')
        iconHost.className = 'size-full'
        const iconRoot = createRoot(iconHost)
        iconRoot.render(
          <CategoryIcon
            category={discovery.category}
            className="size-full text-white"
          />,
        )
        iconLayer.appendChild(iconHost)

        const photoLayer = document.createElement('span')
        photoLayer.dataset.discoveryPhoto = ''
        photoLayer.className =
          'absolute inset-0 bg-cover bg-center bg-no-repeat'

        visual.append(colorLayer, iconLayer, photoLayer)
        button.appendChild(visual)
        markerHost.appendChild(button)

        const marker = new Marker({
          element: markerHost,
          opacityWhenCovered: 0,
        })
          .setLngLat(discovery.coordinates)
          .addTo(instance)
        const entry: DiscoveryMarkerEntry = {
          marker,
          markerHost,
          button,
          visual,
          colorLayer,
          iconLayer,
          photoLayer,
          iconRoot,
          discovery,
          photoState: 'idle',
          photoRequestGeneration: 0,
        }
        applyDiscoveryMarkerVisual(entry, instance.getZoom())
        markers.add(marker)
        roots.add(iconRoot)
        discoveryMarkers.set(discovery.id, entry)
      }

      const loadDiscoveryPhoto = (entry: DiscoveryMarkerEntry) => {
        const { discovery } = entry
        const token = photoAccessTokenRef.current
        if (
          entry.photoState !== 'idle' ||
          !token ||
          !discovery.imageObjectKey
        ) {
          return
        }

        const requestGeneration = ++entry.photoRequestGeneration
        const requestedImageObjectKey = discovery.imageObjectKey
        const requestedToken = token

        entry.photoState = 'loading'
        void getPhoto(requestedToken, requestedImageObjectKey, 'map')
          .then(async (blob) => {
            if (
              !active ||
              discoveryMarkers.get(discovery.id) !== entry ||
              entry.photoRequestGeneration !== requestGeneration ||
              entry.discovery.imageObjectKey !== requestedImageObjectKey ||
              photoAccessTokenRef.current !== requestedToken
            ) {
              return
            }

            const objectUrl = URL.createObjectURL(blob)
            entry.objectUrl = objectUrl
            const image = document.createElement('img')
            image.src = objectUrl
            await image.decode?.()

            if (
              !active ||
              discoveryMarkers.get(discovery.id) !== entry ||
              entry.photoRequestGeneration !== requestGeneration ||
              entry.discovery.imageObjectKey !== requestedImageObjectKey ||
              photoAccessTokenRef.current !== requestedToken
            ) {
              if (entry.objectUrl === objectUrl) {
                URL.revokeObjectURL(objectUrl)
                entry.objectUrl = undefined
              }
              return
            }

            entry.photoState = 'loaded'
            entry.photoLayer.style.backgroundImage = `url("${objectUrl}")`
            applyDiscoveryMarkerVisual(entry, instance.getZoom())
          })
          .catch(() => {
            if (
              !active ||
              discoveryMarkers.get(discovery.id) !== entry ||
              entry.photoRequestGeneration !== requestGeneration ||
              entry.discovery.imageObjectKey !== requestedImageObjectKey ||
              photoAccessTokenRef.current !== requestedToken
            ) {
              return
            }
            if (entry.objectUrl) {
              URL.revokeObjectURL(entry.objectUrl)
              entry.objectUrl = undefined
            }
            entry.photoState = 'error'
            entry.photoLayer.style.backgroundImage = ''
            applyDiscoveryMarkerVisual(entry, instance.getZoom())
          })
      }

      const updateNormalClusterPresentation = (entry: ClusterMarkerEntry) => {
        const size = clusterVisualSize(entry.pointCount)
        entry.button.setAttribute(
          'aria-label',
          `${entry.pointCount} discoveries nearby`,
        )
        entry.normalVisual.style.display = ''
        entry.normalVisual.style.width = `${size}px`
        entry.normalVisual.style.height = `${size}px`
        entry.normalVisual.style.backgroundColor = getClusterColor(
          entry.feature,
          entry.pointCount,
        )
        entry.normalVisual.style.backgroundImage = getDiscoveryClusterGradient(
          entry.feature.properties,
          entry.pointCount,
        )
        entry.countLabel.textContent = String(entry.pointCount)
        entry.stackVisual.style.display = 'none'
        entry.isStack = false
      }

      const updateStackPresentation = (entry: ClusterMarkerEntry) => {
        entry.button.setAttribute(
          'aria-label',
          `Open ${entry.pointCount} nearby discoveries`,
        )
        entry.normalVisual.style.display = 'none'
        entry.stackVisual.style.display = ''
        entry.stackCount.textContent = String(entry.pointCount)
        entry.isStack = true
      }

      const renderClusterPresentation = (
        entry: ClusterMarkerEntry,
        zoom: number,
      ) => {
        const isStack =
          entry.stackEligibility === 'stack' && zoom >= DISCOVERY_STACK_MIN_ZOOM

        if (isStack) {
          updateStackPresentation(entry)
        } else {
          updateNormalClusterPresentation(entry)
        }
      }

      const getClusterExpansionZoom = (
        source: GeoJSONSource,
        clusterId: number,
        generation: number,
      ): Promise<number> => {
        if (generation !== discoveryGeneration) {
          return Promise.reject(new Error('Stale cluster expansion lookup.'))
        }
        const cached = clusterExpansionZooms.get(clusterId)
        if (cached !== undefined) return Promise.resolve(cached)

        const pending = pendingClusterExpansionZooms.get(clusterId)
        if (pending) return pending

        const request = source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            if (generation === discoveryGeneration) {
              clusterExpansionZooms.set(clusterId, zoom)
              pendingClusterExpansionZooms.delete(clusterId)
            }
            return zoom
          })
          .catch((error: unknown) => {
            if (generation === discoveryGeneration) {
              pendingClusterExpansionZooms.delete(clusterId)
            }
            throw error
          })
        pendingClusterExpansionZooms.set(clusterId, request)
        return request
      }

      const loadStackRepresentative = (
        source: GeoJSONSource,
        clusterId: number,
        entry: ClusterMarkerEntry,
        generation: number,
      ) => {
        if (entry.representativePhotoState !== 'idle') return
        entry.representativePhotoState = 'loading'

        void source
          .getClusterLeaves(clusterId, 1, 0)
          .then(async (leaves) => {
            if (
              !active ||
              discoveryGeneration !== generation ||
              clusterMarkers.get(clusterId) !== entry
            ) {
              return
            }

            const discoveryId = Number(leaves[0]?.id)
            const discovery = discoveriesRef.current.find(
              ({ id }) => id === discoveryId,
            )
            if (!discovery)
              throw new Error('Cluster leaf is no longer present.')

            entry.stackFront.style.backgroundColor = getDiscoveryMapColor(
              discovery.category,
            )
            const token = photoAccessTokenRef.current
            if (!token || !discovery.imageObjectKey) {
              entry.representativePhotoState = 'error'
              return
            }

            const blob = await getPhoto(token, discovery.imageObjectKey, 'map')
            if (
              !active ||
              discoveryGeneration !== generation ||
              clusterMarkers.get(clusterId) !== entry
            ) {
              return
            }

            const objectUrl = URL.createObjectURL(blob)
            entry.representativeObjectUrl = objectUrl
            const image = document.createElement('img')
            image.src = objectUrl
            await image.decode?.()

            if (
              !active ||
              discoveryGeneration !== generation ||
              clusterMarkers.get(clusterId) !== entry ||
              entry.representativeObjectUrl !== objectUrl
            ) {
              if (entry.representativeObjectUrl === objectUrl) {
                URL.revokeObjectURL(objectUrl)
                entry.representativeObjectUrl = undefined
              }
              return
            }

            entry.representativePhotoState = 'loaded'
            entry.stackFront.style.backgroundImage = `url("${objectUrl}")`
          })
          .catch(() => {
            if (
              !active ||
              discoveryGeneration !== generation ||
              clusterMarkers.get(clusterId) !== entry
            ) {
              return
            }
            if (entry.representativeObjectUrl) {
              URL.revokeObjectURL(entry.representativeObjectUrl)
              entry.representativeObjectUrl = undefined
            }
            entry.representativePhotoState = 'error'
          })
      }

      const openOrExpandCluster = async (
        clusterId: number,
        entry: ClusterMarkerEntry,
      ) => {
        const currentGen = discoveryGeneration
        const source = instance.getSource(DISCOVERY_SOURCE_ID) as
          GeoJSONSource | undefined
        if (!source) return

        let expansionZoom: number
        try {
          expansionZoom = await getClusterExpansionZoom(
            source,
            clusterId,
            currentGen,
          )
        } catch {
          return
        }
        if (
          !active ||
          discoveryGeneration !== currentGen ||
          clusterMarkers.get(clusterId) !== entry
        ) {
          return
        }

        const currentZoom = instance.getZoom()
        if (currentZoom < DISCOVERY_STACK_MIN_ZOOM) {
          instance.easeTo({
            center: entry.coordinates,
            zoom: Math.min(expansionZoom, DISCOVERY_STACK_MIN_ZOOM),
            duration: 350,
          })
          return
        }

        if (expansionZoom < DISCOVERY_STACK_EXPANSION_ZOOM) {
          instance.easeTo({
            center: entry.coordinates,
            zoom: expansionZoom,
            duration: 350,
          })
          return
        }

        let leaves
        try {
          leaves = await source.getClusterLeaves(clusterId, entry.pointCount, 0)
        } catch {
          return
        }
        if (
          !active ||
          discoveryGeneration !== currentGen ||
          clusterMarkers.get(clusterId) !== entry
        ) {
          return
        }

        const discoveryById = new globalThis.Map(
          discoveriesRef.current.map((discovery) => [discovery.id, discovery]),
        )
        const stackDiscoveries = leaves
          .map((feature) => discoveryById.get(Number(feature.id)))
          .filter(
            (discovery): discovery is DiscoveryMarkerData =>
              discovery !== undefined,
          )

        if (stackDiscoveries.length === 1) {
          onSelectDiscoveryRef.current?.(stackDiscoveries[0].id)
        } else if (stackDiscoveries.length > 1) {
          setClusterSheetDiscoveries(stackDiscoveries)
        }
      }

      const createClusterMarker = (
        clusterId: number,
        feature: ClusterFeature,
      ): ClusterMarkerEntry => {
        const markerHost = document.createElement('div')
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'relative size-14'

        const normalVisual = document.createElement('span')
        normalVisual.className =
          'absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[#F7F5F0] p-[3px] shadow-[0_2px_7px_rgba(28,25,23,0.2)]'
        const centerVisual = document.createElement('span')
        centerVisual.className =
          'flex size-full items-center justify-center rounded-full bg-[#F7F5F0] text-sm font-bold text-[#292524]'
        const countLabel = document.createElement('span')
        centerVisual.appendChild(countLabel)
        normalVisual.appendChild(centerVisual)

        const stackVisual = document.createElement('span')
        stackVisual.className =
          'absolute inset-0 transition-[opacity,transform] duration-150 motion-reduce:transition-none'
        for (const className of [
          'absolute left-[7px] top-[2px] size-12 rounded-[10px] border-2 border-[#F7F5F0] bg-[#E7E5E0] shadow-sm',
          'absolute left-[4px] top-[5px] size-12 rounded-[10px] border-2 border-[#F7F5F0] bg-[#F0EEE8] shadow-sm',
        ]) {
          const back = document.createElement('span')
          back.className = className
          stackVisual.appendChild(back)
        }
        const stackFront = document.createElement('span')
        stackFront.className =
          'absolute bottom-0 left-0 size-12 rounded-[10px] border-2 border-[#F7F5F0] bg-[#2D5A3D] bg-cover bg-center shadow-[0_2px_7px_rgba(28,25,23,0.22)]'
        const stackCount = document.createElement('span')
        stackCount.className =
          'absolute right-0 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full border border-[#F7F5F0] bg-[#2D5A3D] px-1 text-xs font-bold text-white shadow-sm'
        stackVisual.append(stackFront, stackCount)

        button.append(normalVisual, stackVisual)
        markerHost.appendChild(button)

        const coordinates = feature.geometry.coordinates
        const marker = new Marker({
          element: markerHost,
          opacityWhenCovered: 0,
        })
          .setLngLat(coordinates)
          .addTo(instance)
        const entry: ClusterMarkerEntry = {
          marker,
          button,
          normalVisual,
          countLabel,
          stackVisual,
          stackFront,
          stackCount,
          coordinates,
          pointCount: Number(feature.properties.point_count),
          feature,
          isStack: false,
          stackEligibility: 'unknown',
          representativePhotoState: 'idle',
        }
        button.addEventListener(
          'click',
          () => void openOrExpandCluster(clusterId, entry),
        )
        renderClusterPresentation(entry, instance.getZoom())
        return entry
      }

      const removeClusterMarker = (clusterId: number) => {
        const entry = clusterMarkers.get(clusterId)
        if (!entry) return
        entry.marker.remove()
        if (entry.representativeObjectUrl) {
          URL.revokeObjectURL(entry.representativeObjectUrl)
        }
        clusterMarkers.delete(clusterId)
      }

      const qualifyClusterAsStack = (
        source: GeoJSONSource,
        clusterId: number,
        entry: ClusterMarkerEntry,
      ) => {
        const currentGen = discoveryGeneration
        if (entry.stackEligibility !== 'unknown') {
          if (
            entry.stackEligibility === 'stack' &&
            instance.getZoom() >= DISCOVERY_STACK_MIN_ZOOM &&
            entry.representativePhotoState === 'idle'
          ) {
            loadStackRepresentative(source, clusterId, entry, currentGen)
          }
          return
        }

        if (instance.getZoom() < DISCOVERY_STACK_MIN_ZOOM) return

        void getClusterExpansionZoom(source, clusterId, currentGen)
          .then((expansionZoom) => {
            if (
              !active ||
              discoveryGeneration !== currentGen ||
              clusterMarkers.get(clusterId) !== entry
            ) {
              return
            }
            if (expansionZoom >= DISCOVERY_STACK_EXPANSION_ZOOM) {
              entry.stackEligibility = 'stack'
            } else {
              entry.stackEligibility = 'normal'
            }
            const zoom = instance.getZoom()
            renderClusterPresentation(entry, zoom)
            if (
              entry.stackEligibility === 'stack' &&
              zoom >= DISCOVERY_STACK_MIN_ZOOM
            ) {
              loadStackRepresentative(source, clusterId, entry, currentGen)
            }
          })
          .catch(() => {})
      }

      const syncDiscoverySpatialState = () => {
        const source = instance.getSource(DISCOVERY_SOURCE_ID) as
          GeoJSONSource | undefined
        if (!source) return

        const visibleUnclusteredIds = new Set<number>()
        const visibleClusters = new globalThis.Map<number, ClusterFeature>()
        const features = instance.querySourceFeatures(
          DISCOVERY_SOURCE_ID,
        ) as unknown as ClusterFeature[]

        for (const feature of features) {
          const clusterId = Number(feature.properties.cluster_id)
          if (Number.isFinite(clusterId)) {
            if (!visibleClusters.has(clusterId)) {
              visibleClusters.set(clusterId, feature)
            }
            continue
          }

          const discoveryId = Number(
            (feature as ClusterFeature & { id?: number | string }).id,
          )
          if (Number.isFinite(discoveryId)) {
            visibleUnclusteredIds.add(discoveryId)
          }
        }

        const zoom = instance.getZoom()
        for (const [id, entry] of discoveryMarkers) {
          const visible = visibleUnclusteredIds.has(id)
          entry.markerHost.style.display = visible ? '' : 'none'
          applyDiscoveryMarkerVisual(entry, zoom)
          if (
            visible &&
            zoom >= DISCOVERY_PHOTO_PRELOAD_ZOOM &&
            isCoordinateInMapViewport(
              entry.discovery.coordinates,
              instance.getBounds(),
            )
          ) {
            loadDiscoveryPhoto(entry)
          }
        }

        for (const [clusterId, feature] of visibleClusters) {
          let entry = clusterMarkers.get(clusterId)
          if (!entry) {
            entry = createClusterMarker(clusterId, feature)
            clusterMarkers.set(clusterId, entry)
          } else {
            entry.coordinates = feature.geometry.coordinates
            entry.pointCount = Number(feature.properties.point_count)
            entry.feature = feature
            entry.marker.setLngLat(entry.coordinates)
            renderClusterPresentation(entry, zoom)
          }
          qualifyClusterAsStack(source, clusterId, entry)
        }

        for (const clusterId of [...clusterMarkers.keys()]) {
          if (!visibleClusters.has(clusterId)) removeClusterMarker(clusterId)
        }
      }

      const scheduleDiscoverySpatialSync = () => {
        if (spatialFrame !== null) return
        spatialFrame = requestAnimationFrame(() => {
          spatialFrame = null
          syncDiscoverySpatialState()
        })
      }

      const updateDiscoveryMarkerVisuals = () => {
        const zoom = instance.getZoom()
        for (const entry of discoveryMarkers.values()) {
          applyDiscoveryMarkerVisual(entry, zoom)
        }
        for (const entry of clusterMarkers.values()) {
          renderClusterPresentation(entry, zoom)
        }
        scheduleDiscoverySpatialSync()
      }

      const onDiscoverySourceData = (event: unknown) => {
        const sourceId = (event as { sourceId?: string } | undefined)?.sourceId
        if (sourceId === DISCOVERY_SOURCE_ID) {
          scheduleDiscoverySpatialSync()
        }
      }

      const reconcileDiscoveries = (nextDiscoveries: DiscoveryMarkerData[]) => {
        discoveryGeneration++
        clusterExpansionZooms.clear()
        pendingClusterExpansionZooms.clear()

        for (const clusterId of [...clusterMarkers.keys()]) {
          removeClusterMarker(clusterId)
        }

        const source = instance.getSource(DISCOVERY_SOURCE_ID) as
          GeoJSONSource | undefined
        source?.setData(toDiscoveryFeatureCollection(nextDiscoveries))

        const nextIds = new Set(nextDiscoveries.map((d) => d.id))

        for (const [id, entry] of [...discoveryMarkers.entries()]) {
          if (!nextIds.has(id)) {
            entry.marker.remove()
            markers.delete(entry.marker)
            disposeRoot(entry.iconRoot)
            if (entry.objectUrl) {
              URL.revokeObjectURL(entry.objectUrl)
              entry.objectUrl = undefined
            }
            discoveryMarkers.delete(id)
          }
        }

        const currentZoom = instance.getZoom()
        for (const discovery of nextDiscoveries) {
          const existing = discoveryMarkers.get(discovery.id)
          if (!existing) {
            createDiscoveryMarker(discovery)
          } else {
            const prev = existing.discovery
            existing.discovery = discovery

            if (prev.name !== discovery.name) {
              existing.button.setAttribute(
                'aria-label',
                `View ${discovery.name}`,
              )
            }

            if (
              prev.coordinates[0] !== discovery.coordinates[0] ||
              prev.coordinates[1] !== discovery.coordinates[1]
            ) {
              existing.marker.setLngLat(discovery.coordinates)
            }

            if (prev.category !== discovery.category) {
              existing.colorLayer.style.backgroundColor = getDiscoveryMapColor(
                discovery.category,
              )
              existing.iconRoot.render(
                <CategoryIcon
                  category={discovery.category}
                  className="size-full text-white"
                />,
              )
            }

            if (prev.imageObjectKey !== discovery.imageObjectKey) {
              existing.photoRequestGeneration++
              if (existing.objectUrl) {
                URL.revokeObjectURL(existing.objectUrl)
                existing.objectUrl = undefined
              }
              existing.photoState = 'idle'
              existing.photoLayer.style.backgroundImage = ''
            }

            applyDiscoveryMarkerVisual(existing, currentZoom)
          }
        }

        scheduleDiscoverySpatialSync()
      }

      reconcileDiscoveriesRef.current = reconcileDiscoveries
      updateLandmarksRef.current = updateLandmarkMarkers
      syncSpatialRef.current = scheduleDiscoverySpatialSync

      for (const discovery of discoveriesRef.current) {
        createDiscoveryMarker(discovery)
      }

      updateLandmarkMarkers()
      updatePoiMarkerScale()
      scheduleDiscoverySpatialSync()

      instance.on('move', scheduleDiscoverySpatialSync)
      instance.on('moveend', scheduleDiscoverySpatialSync)
      instance.on('sourcedata', onDiscoverySourceData)
      instance.on('data', onDiscoverySourceData)
      instance.on('moveend', updateLandmarkMarkers)
      instance.on('zoomend', updateLandmarkMarkers)
      instance.on('zoom', updatePoiMarkerScale)
      instance.on('zoom', updateDiscoveryMarkerVisuals)

      return () => {
        active = false
        reconcileDiscoveriesRef.current = null
        updateLandmarksRef.current = null
        syncSpatialRef.current = null
        if (spatialFrame !== null) cancelAnimationFrame(spatialFrame)
        saveCurrentViewport()
        resizeObserver?.disconnect()
        instance.off('moveend', saveCurrentViewport)
        instance.off('zoomend', saveCurrentViewport)
        instance.off('move', scheduleDiscoverySpatialSync)
        instance.off('moveend', scheduleDiscoverySpatialSync)
        instance.off('sourcedata', onDiscoverySourceData)
        instance.off('data', onDiscoverySourceData)
        instance.off('moveend', updateLandmarkMarkers)
        instance.off('zoomend', updateLandmarkMarkers)
        instance.off('zoom', updatePoiMarkerScale)
        instance.off('zoom', updateDiscoveryMarkerVisuals)
        for (const entry of discoveryMarkers.values()) {
          if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
        }
        for (const clusterId of [...clusterMarkers.keys()]) {
          removeClusterMarker(clusterId)
        }
        for (const marker of markers) marker.remove()
        for (const root of roots) disposeRoot(root)
        applyExploredStatesRef.current = () => {}
        map.current = null
        instance.remove()
      }
    }, [])

    const isFirstDiscoveryRender = useRef(true)
    useEffect(() => {
      if (isFirstDiscoveryRender.current) {
        isFirstDiscoveryRender.current = false
        return
      }
      reconcileDiscoveriesRef.current?.(discoveries)
    }, [discoveries])

    const isFirstLandmarksRender = useRef(true)
    useEffect(() => {
      if (isFirstLandmarksRender.current) {
        isFirstLandmarksRender.current = false
        return
      }
      updateLandmarksRef.current?.()
    }, [landmarks])

    useEffect(() => {
      syncSpatialRef.current?.()
    }, [photoAccessToken])

    useEffect(() => {
      const instance = map.current
      if (!instance || !userLocation) return

      const element = document.createElement('div')
      element.className = 'maplibregl-user-location-dot'
      element.setAttribute('role', 'img')
      element.setAttribute('aria-label', 'Your current location')
      const marker = new Marker({ element })
        .setLngLat(userLocation)
        .addTo(instance)

      return () => {
        marker.remove()
      }
    }, [userLocation])

    useEffect(() => {
      exploredCodes.current = exploredCountryCodes
      applyExploredStatesRef.current()
    }, [exploredCountryCodes])

    return (
      <div className="absolute inset-0">
        <div
          ref={mapContainer}
          aria-label="Interactive map"
          className="h-full w-full [&_.maplibregl-ctrl-top-left]:hidden"
        />
        <DiscoveryClusterSheet
          open={clusterSheetDiscoveries.length > 1}
          discoveries={clusterSheetDiscoveries}
          photoAccessToken={photoAccessToken}
          onOpenChange={(open) => {
            if (!open) setClusterSheetDiscoveries([])
          }}
          onSelectDiscovery={(id) => onSelectDiscoveryRef.current?.(id)}
        />
      </div>
    )
  },
)
