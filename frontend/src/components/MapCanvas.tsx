import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Trophy } from 'lucide-react'
import {
  GeolocateControl,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { CategoryIcon } from '@/components/CategoryIcon'
import type { DiscoveryCategory } from '@/lib/mock-data'

setWorkerUrl(maplibreWorkerUrl)

const mapStyle = 'https://tiles.openfreemap.org/styles/bright'
const countriesSourceId = 'countries'
const unexploredFillLayerId = 'unexplored-countries-fill'
const countryBorderLayerId = 'country-borders'

export interface MapCanvasHandle {
  locate: () => void
}

export interface DiscoveryMarkerData {
  id: number
  name: string
  category: DiscoveryCategory
  coordinates: [number, number]
}

export interface LandmarkMarkerData {
  id: string
  name: string
  coordinates: [number, number]
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

      instance.addControl(
        new NavigationControl({ showCompass: false }),
        'bottom-right',
      )

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
              // countries.geo.json has a handful of features whose claimed
              // territory genuinely overlaps another one's — Crimea is drawn
              // as part of both RUS and UKR, Western Sahara as part of both
              // MAR and ESH. Both polygons render (neither claim's borders or
              // country-detection are touched), each independently lit by its
              // own real discoveries, but two 0.55 fills stacked over the same
              // pixels compose darker than every other, single-covered
              // country. Halving opacity for just these codes cancels that
              // out: 1-(1-0.3292)^2 ≈ 0.55, matching everyone else when
              // neither side has been explored yet.
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'explored'], false],
                0,
                ['match', ['get', 'A3'], ['RUS', 'UKR', 'MAR', 'ESH'], 0.3292, 0.55],
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
      }

      return () => {
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
