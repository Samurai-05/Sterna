import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { GeolocateControl, Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { CategoryIcon } from '@/components/CategoryIcon'
import { categoryAppearance } from '@/lib/category-appearance'
import {
  defaultMapViewport,
  getStoredMapViewport,
  saveMapViewport,
  type MapViewport,
} from '@/lib/map-viewport'
import { imageUrl, type DiscoveryCategory } from '@/lib/mock-data'
import { acquirePhotoUrl, releasePhotoUrl } from '@/lib/photo-url-cache'
import { cn } from '@/lib/utils'

setWorkerUrl(maplibreWorkerUrl)

const mapStyle = 'https://tiles.openfreemap.org/styles/bright'
const countriesSourceId = 'countries'
const unexploredFillLayerId = 'unexplored-countries-fill'
const countryBorderLayerId = 'country-borders'
// Zoom level from which a marker is "close" enough that its photo pre-opens
// above the pin instead of waiting for a tap. Below street level (~15) so the
// photo shows up while still zooming in, not only once fully street-level.
const photoPreopenZoom = 13
// Zoom level below which POI markers are hidden. Around whole-country level
// (~5) so pins stay visible while browsing a country, and only disappear once
// zoomed out to a continent/world view where they'd overlap and clutter.
const landmarkMinZoom = 5

// countries.geo.json gives two genuinely disputed areas their own feature
// instead of folding them into either claim's polygon — XCR (Crimea, claimed
// by RUS and UKR) and XWS (the Morocco/Western-Sahara overlap, MAR and ESH).
// Neither claim is favoured: the shared zone's veil lifts the moment either
// side of the dispute is explored.
const disputedZoneClaims: Record<string, string[]> = {
  XCR: ['RUS', 'UKR'],
  XWS: ['MAR', 'ESH'],
}

export interface MapCanvasHandle {
  locate: () => void
  resize: () => void
  flyTo: (coordinates: [number, number], zoom?: number) => void
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

function createPhotoPreviewElement(
  name: string,
  source: string | undefined,
  onSelect: () => void,
): { element: HTMLButtonElement; image: HTMLImageElement } {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', `View ${name}`)
  button.className =
    'block size-[104px] overflow-hidden rounded-xl border-2 border-white bg-muted shadow-lg'
  button.addEventListener('click', onSelect)

  const img = document.createElement('img')
  if (source) img.src = source
  img.hidden = !source
  img.alt = ''
  img.className = 'size-full object-cover'

  button.appendChild(img)
  return { element: button, image: img }
}

interface MapCanvasProps {
  initialViewport?: MapViewport
  discoveries?: DiscoveryMarkerData[]
  landmarks?: LandmarkMarkerData[]
  exploredCountryCodes?: string[]
  onSelectDiscovery?: (id: number) => void
  onSelectLandmark?: (id: string) => void
  photoAccessToken?: string
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      discoveries = [],
      landmarks = [],
      exploredCountryCodes = [],
      onSelectDiscovery,
      onSelectLandmark,
      photoAccessToken,
      initialViewport,
    },
    ref,
  ) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<Map | null>(null)
    const pendingTarget = useRef<{
      coordinates: [number, number]
      zoom: number
    } | null>(null)
    const geolocateControl = useRef<GeolocateControl | null>(null)
    const exploredCodes = useRef<string[]>(exploredCountryCodes)
    const appliedCodes = useRef<Set<string>>(new Set())
    const applyExploredStatesRef = useRef<() => void>(() => {})

    useImperativeHandle(ref, () => ({
      locate: () => geolocateControl.current?.trigger(),
      resize: () => map.current?.resize(),
      flyTo: (coordinates, zoom = 15) => {
        if (map.current) {
          map.current.flyTo({ center: coordinates, zoom })
        } else {
          pendingTarget.current = { coordinates, zoom }
        }
      },
    }))

    useEffect(() => {
      if (!mapContainer.current || navigator.userAgent.includes('jsdom')) {
        return
      }

      const viewport =
        initialViewport ?? getStoredMapViewport() ?? defaultMapViewport
      const instance = new Map({
        container: mapContainer.current,
        style: mapStyle,
        center: viewport.center,
        zoom: viewport.zoom,
      })

      const saveCurrentViewport = () => {
        const center = instance.getCenter()
        saveMapViewport({
          center: [center.lng, center.lat],
          zoom: instance.getZoom(),
        })
      }

      instance.on('moveend', saveCurrentViewport)
      instance.on('zoomend', saveCurrentViewport)

      const geolocate = new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      })
      instance.addControl(geolocate, 'top-left')
      geolocateControl.current = geolocate

      const applyExploredStates = () => {
        if (!instance.getSource(countriesSourceId)) {
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
              { source: countriesSourceId, id: code },
              { explored: true },
            )
          }
        }
        for (const code of appliedCodes.current) {
          if (!codes.has(code)) {
            instance.setFeatureState(
              { source: countriesSourceId, id: code },
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

        instance.addSource(countriesSourceId, {
          type: 'geojson',
          data: '/countries.geo.json',
          promoteId: 'A3',
        })

        // Insert below the first text label so the veil dims colors/roads
        // without dulling place names on top of it.
        const firstSymbolLayerId = instance
          .getStyle()
          ?.layers.find((layer) => layer.type === 'symbol')?.id

        instance.addLayer(
          {
            id: unexploredFillLayerId,
            type: 'fill',
            source: countriesSourceId,
            paint: {
              'fill-color': '#38404a',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'explored'], false],
                0,
                0.55,
              ],
            },
          },
          firstSymbolLayerId,
        )

        instance.addLayer(
          {
            id: countryBorderLayerId,
            type: 'line',
            source: countriesSourceId,
            paint: {
              'line-color': 'rgba(255,255,255,0.5)',
              'line-width': 1,
            },
          },
          firstSymbolLayerId,
        )

        const onSourceData = () => {
          if (!instance.isSourceLoaded(countriesSourceId)) {
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

      return () => {
        saveCurrentViewport()
        instance.off('moveend', saveCurrentViewport)
        instance.off('zoomend', saveCurrentViewport)
        applyExploredStatesRef.current = () => {}
        geolocateControl.current = null
        map.current = null
        instance.remove()
      }
    }, [initialViewport])

    useEffect(() => {
      exploredCodes.current = exploredCountryCodes
      applyExploredStatesRef.current()
    }, [exploredCountryCodes])

    useEffect(() => {
      const instance = map.current
      if (!instance) {
        return
      }

      const markers: Marker[] = []
      const roots: Root[] = []
      const photoPopups: Popup[] = []
      const photoReleases: Array<() => void> = []
      const landmarkElements: HTMLDivElement[] = []
      let active = true

      const updatePhotoPopups = () => {
        const shouldShow = instance.getZoom() >= photoPreopenZoom
        for (const popup of photoPopups) {
          if (shouldShow) {
            if (!popup.isOpen()) popup.addTo(instance)
          } else if (popup.isOpen()) {
            popup.remove()
          }
        }
      }

      const updateLandmarkVisibility = () => {
        const shouldShow = instance.getZoom() >= landmarkMinZoom
        for (const el of landmarkElements) {
          el.style.display = shouldShow ? '' : 'none'
        }
      }

      for (const discovery of discoveries) {
        const el = document.createElement('div')
        const root = createRoot(el)
        const appearance = categoryAppearance[discovery.category]
        root.render(
          <button
            type="button"
            aria-label={`View ${discovery.name}`}
            className={cn(
              'flex size-11 items-center justify-center rounded-full border-2 border-white shadow-lg ring-2',
              appearance.background,
              appearance.ring,
            )}
            onClick={() => onSelectDiscovery?.(discovery.id)}
          >
            <CategoryIcon category={discovery.category} className="size-5" />
          </button>,
        )
        markers.push(
          new Marker({ element: el })
            .setLngLat(discovery.coordinates)
            .addTo(instance),
        )
        roots.push(root)

        const authenticatedPhoto = Boolean(
          photoAccessToken && discovery.imageObjectKey,
        )
        const preview = createPhotoPreviewElement(
          discovery.name,
          authenticatedPhoto ? undefined : imageUrl(discovery.imageId, 220),
          () => onSelectDiscovery?.(discovery.id),
        )

        if (photoAccessToken && discovery.imageObjectKey) {
          const imageObjectKey = discovery.imageObjectKey
          void acquirePhotoUrl(photoAccessToken, imageObjectKey)
            .then((objectUrl) => {
              if (!active) return
              preview.image.src = objectUrl
              preview.image.hidden = false
            })
            .catch(() => {
              // Keep the neutral placeholder when a photo cannot load.
            })
          photoReleases.push(() =>
            releasePhotoUrl(photoAccessToken, imageObjectKey),
          )
        }

        photoPopups.push(
          new Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 28,
            anchor: 'bottom',
            className: 'sterna-map-photo-popup',
          })
            .setLngLat(discovery.coordinates)
            .setDOMContent(preview.element),
        )
      }

      for (const landmark of landmarks) {
        const el = document.createElement('div')
        const root = createRoot(el)
        const markerImage = landmark.imageUrl ?? imageUrl(landmark.imageId, 160)
        root.render(
          <button
            type="button"
            aria-label={`View ${landmark.name}`}
            className={`relative size-11 overflow-hidden rounded-full border-2 shadow-lg ${landmark.discovered ? 'border-[#EAB308]' : 'border-white bg-stone-400 grayscale'}`}
            onClick={() => onSelectLandmark?.(landmark.id)}
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
              className={`relative size-full object-contain ${landmark.discovered ? '' : 'opacity-70'}`}
            />
            <span className="sr-only">
              {landmark.discovered ? 'Discovered' : 'Undiscovered'}
            </span>
          </button>,
        )
        markers.push(
          new Marker({ element: el })
            .setLngLat(landmark.coordinates)
            .addTo(instance),
        )
        roots.push(root)
        landmarkElements.push(el)

        // POIs deliberately have no photo popup above their marker. Their
        // image remains available inside the marker and on the detail page.
      }

      updatePhotoPopups()
      updateLandmarkVisibility()
      instance.on('zoom', updatePhotoPopups)
      instance.on('zoom', updateLandmarkVisibility)

      return () => {
        active = false
        instance.off('zoom', updatePhotoPopups)
        instance.off('zoom', updateLandmarkVisibility)
        photoPopups.forEach((popup) => popup.remove())
        markers.forEach((marker) => marker.remove())
        // Deferred: unmounting synchronously here can race with React's own
        // commit of an unrelated update (e.g. this page unmounting on
        // navigation), which logs a "synchronously unmount" warning.
        roots.forEach((root) => queueMicrotask(() => root.unmount()))
        photoReleases.forEach((release) => release())
      }
    }, [
      discoveries,
      landmarks,
      onSelectDiscovery,
      onSelectLandmark,
      photoAccessToken,
    ])

    return (
      <div className="absolute inset-0">
        <div
          ref={mapContainer}
          aria-label="Interactive map"
          className="h-full w-full [&_.maplibregl-ctrl-top-left]:hidden"
        />
      </div>
    )
  },
)
