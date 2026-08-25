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
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { CategoryIcon } from '@/components/CategoryIcon'
import type { DiscoveryCategory } from '@/lib/mock-data'

setWorkerUrl(maplibreWorkerUrl)

const openFreeMapStyle = 'https://tiles.openfreemap.org/styles/liberty'
const countriesSourceId = 'countries'
const unexploredCountriesLayerId = 'unexplored-countries'

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

    useImperativeHandle(ref, () => ({
      locate: () => geolocateControl.current?.trigger(),
    }))

    useEffect(() => {
      if (!mapContainer.current || navigator.userAgent.includes('jsdom')) {
        return
      }

      const instance = new Map({
        container: mapContainer.current,
        style: openFreeMapStyle,
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
      map.current = instance

      return () => {
        geolocateControl.current = null
        map.current = null
        instance.remove()
      }
    }, [])

    useEffect(() => {
      const instance = map.current
      if (!instance) {
        return
      }

      const applyUnexploredMask = () => {
        if (!instance.getSource(countriesSourceId)) {
          instance.addSource(countriesSourceId, {
            type: 'geojson',
            data: '/countries.geo.json',
          })
        }
        if (!instance.getLayer(unexploredCountriesLayerId)) {
          instance.addLayer({
            id: unexploredCountriesLayerId,
            type: 'fill',
            source: countriesSourceId,
            paint: {
              'fill-color': '#8a8a8a',
              'fill-opacity': 0.65,
            },
          })
        }
        instance.setFilter(unexploredCountriesLayerId, [
          '!',
          ['in', ['get', 'iso_a3'], ['literal', exploredCountryCodes]],
        ])
      }

      if (instance.isStyleLoaded()) {
        applyUnexploredMask()
      } else {
        instance.once('load', applyUnexploredMask)
      }

      return () => {
        instance.off('load', applyUnexploredMask)
      }
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
