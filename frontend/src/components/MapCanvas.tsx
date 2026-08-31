import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { GeolocateControl, Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { CategoryIcon } from '@/components/CategoryIcon'
import { getPhoto } from '@/lib/api'
import { categoryAppearance } from '@/lib/category-appearance'
import {
  defaultMapViewport,
  getStoredMapViewport,
  saveMapViewport,
  type MapViewport,
} from '@/lib/map-viewport'
import {
  getVisibleLandmarks,
  isCoordinateInMapViewport,
} from '@/lib/map-markers'
import { type DiscoveryCategory } from '@/lib/mock-data'
import { getPoiImageUrl } from '@/lib/poi-image'
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
  onSelect: () => void,
): { element: HTMLButtonElement; placeholder: HTMLDivElement } {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', `View ${name}`)
  button.className =
    'block size-[104px] overflow-hidden rounded-xl border-2 border-white shadow-lg'
  button.addEventListener('click', onSelect)

  const placeholder = document.createElement('div')
  placeholder.setAttribute('aria-label', `Loading photo for ${name}`)
  placeholder.className = 'size-full animate-pulse bg-muted'

  button.appendChild(placeholder)
  return { element: button, placeholder }
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

      const markers = new Set<Marker>()
      const roots = new Set<Root>()
      const photoPreviews = new globalThis.Map<
        number,
        {
          popup: Popup
          placeholder: HTMLDivElement
          objectUrl?: string
        }
      >()
      const landmarkMarkers = new globalThis.Map<
        string,
        { marker: Marker; root: Root }
      >()
      let active = true

      const disposeRoot = (root: Root) => {
        if (!roots.delete(root)) return
        queueMicrotask(() => root.unmount())
      }

      const removeMarker = (marker: Marker, root?: Root) => {
        marker.remove()
        markers.delete(marker)
        if (root) disposeRoot(root)
      }

      const removePhotoPreview = (id: number) => {
        const preview = photoPreviews.get(id)
        if (!preview) return
        preview.popup.remove()
        if (preview.objectUrl) URL.revokeObjectURL(preview.objectUrl)
        photoPreviews.delete(id)
      }

      const updatePhotoPreviews = () => {
        const shouldShow = instance.getZoom() >= photoPreopenZoom
        const visibleDiscoveries = shouldShow
          ? discoveries.filter((discovery) =>
              isCoordinateInMapViewport(
                discovery.coordinates,
                instance.getBounds(),
              ),
            )
          : []
        const visibleIds = new Set(
          visibleDiscoveries.map((discovery) => discovery.id),
        )

        for (const id of photoPreviews.keys()) {
          if (!visibleIds.has(id)) removePhotoPreview(id)
        }

        for (const discovery of visibleDiscoveries) {
          if (photoPreviews.has(discovery.id)) continue

          const preview = createPhotoPreviewElement(discovery.name, () =>
            onSelectDiscovery?.(discovery.id),
          )
          const popup = new Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 28,
            anchor: 'bottom',
            className: 'sterna-map-photo-popup',
          })
            .setLngLat(discovery.coordinates)
            .setDOMContent(preview.element)

          const entry: {
            popup: Popup
            placeholder: HTMLDivElement
            objectUrl?: string
          } = { popup, placeholder: preview.placeholder }
          photoPreviews.set(discovery.id, entry)
          popup.addTo(instance)

          if (photoAccessToken && discovery.imageObjectKey) {
            void getPhoto(photoAccessToken, discovery.imageObjectKey, 'map')
              .then(async (blob) => {
                if (!active || photoPreviews.get(discovery.id) !== entry) {
                  return
                }

                const objectUrl = URL.createObjectURL(blob)
                entry.objectUrl = objectUrl
                const image = document.createElement('img')
                image.alt = ''
                image.className = 'size-full object-cover'
                image.src = objectUrl
                try {
                  await image.decode?.()
                } catch {
                  throw new Error('Unable to decode discovery photo.')
                }

                if (
                  !active ||
                  photoPreviews.get(discovery.id) !== entry ||
                  entry.objectUrl !== objectUrl
                ) {
                  return
                }

                entry.placeholder.replaceWith(image)
              })
              .catch(() => {
                if (!active || photoPreviews.get(discovery.id) !== entry) {
                  return
                }

                if (entry.objectUrl) {
                  URL.revokeObjectURL(entry.objectUrl)
                  entry.objectUrl = undefined
                }
                entry.placeholder.className =
                  'flex size-full items-center justify-center bg-muted text-xs text-muted-foreground'
                entry.placeholder.setAttribute(
                  'aria-label',
                  `Photo unavailable for ${discovery.name}`,
                )
                entry.placeholder.textContent = 'Photo unavailable'
              })
          }
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

        const marker = new Marker({ element: el })
          .setLngLat(landmark.coordinates)
          .addTo(instance)
        markers.add(marker)
        roots.add(root)
        landmarkMarkers.set(landmark.id, { marker, root })
      }

      const updateLandmarkMarkers = () => {
        if (instance.getZoom() < landmarkMinZoom) {
          for (const { marker, root } of landmarkMarkers.values()) {
            removeMarker(marker, root)
          }
          landmarkMarkers.clear()
          return
        }

        const visibleLandmarks = getVisibleLandmarks(
          landmarks,
          instance.getBounds(),
        )
        const visibleIds = new Set(
          visibleLandmarks.map((landmark) => landmark.id),
        )

        for (const [id, { marker, root }] of landmarkMarkers) {
          if (!visibleIds.has(id)) {
            removeMarker(marker, root)
            landmarkMarkers.delete(id)
          }
        }

        for (const landmark of visibleLandmarks) {
          if (!landmarkMarkers.has(landmark.id)) {
            createLandmarkMarker(landmark)
          }
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
        const marker = new Marker({ element: el })
          .setLngLat(discovery.coordinates)
          .addTo(instance)
        markers.add(marker)
        roots.add(root)
      }

      updatePhotoPreviews()
      updateLandmarkMarkers()
      instance.on('moveend', updatePhotoPreviews)
      instance.on('zoomend', updatePhotoPreviews)
      instance.on('moveend', updateLandmarkMarkers)
      instance.on('zoomend', updateLandmarkMarkers)

      return () => {
        active = false
        instance.off('moveend', updatePhotoPreviews)
        instance.off('zoomend', updatePhotoPreviews)
        instance.off('moveend', updateLandmarkMarkers)
        instance.off('zoomend', updateLandmarkMarkers)
        for (const id of photoPreviews.keys()) removePhotoPreview(id)
        for (const marker of markers) marker.remove()
        for (const root of roots) disposeRoot(root)
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
