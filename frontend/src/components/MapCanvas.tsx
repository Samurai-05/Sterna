import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Trophy } from 'lucide-react'
import { GeolocateControl, Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { CategoryIcon } from '@/components/CategoryIcon'
import { imageUrl, type DiscoveryCategory } from '@/lib/mock-data'

setWorkerUrl(maplibreWorkerUrl)

const mapStyle = 'https://tiles.openfreemap.org/styles/bright'
const countriesSourceId = 'countries'
const unexploredFillLayerId = 'unexplored-countries-fill'
const countryBorderLayerId = 'country-borders'
// Zoom level from which a marker is "close" enough that its photo pre-opens
// above the pin instead of waiting for a tap.
const photoPreopenZoom = 15

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
}

export interface DiscoveryMarkerData {
  id: number
  name: string
  category: DiscoveryCategory
  imageId: string
  coordinates: [number, number]
}

export interface LandmarkMarkerData {
  id: string
  name: string
  imageId: string
  coordinates: [number, number]
}

function createPhotoPreviewElement(
  name: string,
  imageId: string,
  onSelect: () => void,
) {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', `View ${name}`)
  button.className =
    'block size-[72px] overflow-hidden rounded-xl border-2 border-white shadow-lg'
  button.addEventListener('click', onSelect)

  const img = document.createElement('img')
  img.src = imageUrl(imageId, 160)
  img.alt = ''
  img.className = 'size-full object-cover'

  button.appendChild(img)
  return button
}

interface MapCanvasProps {
  discoveries?: DiscoveryMarkerData[]
  landmarks?: LandmarkMarkerData[]
  exploredCountryCodes?: string[]
  onSelectDiscovery?: (id: number) => void
  onSelectLandmark?: (id: string) => void
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      discoveries = [],
      landmarks = [],
      exploredCountryCodes = [],
      onSelectDiscovery,
      onSelectLandmark,
    },
    ref,
  ) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<Map | null>(null)
    const geolocateControl = useRef<GeolocateControl | null>(null)
    const exploredCodes = useRef<string[]>(exploredCountryCodes)
    const appliedCodes = useRef<Set<string>>(new Set())
    const applyExploredStatesRef = useRef<() => void>(() => {})

    useImperativeHandle(ref, () => ({
      locate: () => geolocateControl.current?.trigger(),
    }))

    useEffect(() => {
      if (!mapContainer.current || navigator.userAgent.includes('jsdom')) {
        return
      }

      const instance = new Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [2.3522, 48.8566],
        zoom: 12,
      })

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

      return () => {
        applyExploredStatesRef.current = () => {}
        geolocateControl.current = null
        map.current = null
        instance.remove()
      }
    }, [])

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

      for (const discovery of discoveries) {
        const el = document.createElement('div')
        const root = createRoot(el)
        root.render(
          <button
            type="button"
            aria-label={`View ${discovery.name}`}
            className="flex size-11 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg"
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

        photoPopups.push(
          new Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 28,
            anchor: 'bottom',
            className: 'sterna-map-photo-popup',
          })
            .setLngLat(discovery.coordinates)
            .setDOMContent(
              createPhotoPreviewElement(discovery.name, discovery.imageId, () =>
                onSelectDiscovery?.(discovery.id),
              ),
            ),
        )
      }

      for (const landmark of landmarks) {
        const el = document.createElement('div')
        const root = createRoot(el)
        root.render(
          <button
            type="button"
            aria-label={`View ${landmark.name}`}
            className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-[#c4622d] text-white shadow-lg"
            onClick={() => onSelectLandmark?.(landmark.id)}
          >
            <Trophy className="size-4" />
          </button>,
        )
        markers.push(
          new Marker({ element: el })
            .setLngLat(landmark.coordinates)
            .addTo(instance),
        )
        roots.push(root)

        photoPopups.push(
          new Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 26,
            anchor: 'bottom',
            className: 'sterna-map-photo-popup',
          })
            .setLngLat(landmark.coordinates)
            .setDOMContent(
              createPhotoPreviewElement(landmark.name, landmark.imageId, () =>
                onSelectLandmark?.(landmark.id),
              ),
            ),
        )
      }

      updatePhotoPopups()
      instance.on('zoom', updatePhotoPopups)

      return () => {
        instance.off('zoom', updatePhotoPopups)
        photoPopups.forEach((popup) => popup.remove())
        markers.forEach((marker) => marker.remove())
        // Deferred: unmounting synchronously here can race with React's own
        // commit of an unrelated update (e.g. this page unmounting on
        // navigation), which logs a "synchronously unmount" warning.
        roots.forEach((root) => queueMicrotask(() => root.unmount()))
      }
    }, [discoveries, landmarks, onSelectDiscovery, onSelectLandmark])

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
