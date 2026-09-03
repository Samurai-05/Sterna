import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import {
  GeolocateControl,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { getCurrentDevicePosition } from '@/lib/device-location'
import { defaultGlobeViewport } from '@/lib/map-viewport'

setWorkerUrl(maplibreWorkerUrl)

const mapStyle = 'https://tiles.openfreemap.org/styles/bright'

export interface LocationPickerMapHandle {
  /** Recenters the map and moves the pin without waiting for a tap/drag. */
  flyTo: (coordinates: [number, number], zoom?: number) => void
}

interface LocationPickerMapProps {
  coordinates?: [number, number]
  onChange: (coordinates: [number, number]) => void
  className?: string
}

// Lets the user drop/drag a pin instead of typing coordinates. `coordinates`
// only sets the initial position (the map is only created once, like
// MapCanvas) — use the `flyTo` handle to move the pin programmatically
// afterwards (e.g. once a photo's EXIF location comes back).
export const LocationPickerMap = forwardRef<
  LocationPickerMapHandle,
  LocationPickerMapProps
>(function LocationPickerMap({ coordinates, onChange, className }, ref) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const marker = useRef<Marker | null>(null)
  const initialCoordinates = useRef(coordinates)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useImperativeHandle(ref, () => ({
    flyTo: (nextCoordinates, zoom = 15) => {
      if (!marker.current && map.current) {
        marker.current = createLocationMarker(
          map.current,
          nextCoordinates,
          onChangeRef,
        )
      } else {
        marker.current?.setLngLat(nextCoordinates)
      }
      map.current?.flyTo({ center: nextCoordinates, zoom })
    },
  }))

  useEffect(() => {
    if (!mapContainer.current || navigator.userAgent.includes('jsdom')) {
      return
    }

    const instance = new Map({
      container: mapContainer.current,
      style: mapStyle,
      center: initialCoordinates.current ?? defaultGlobeViewport.center,
      zoom: initialCoordinates.current ? 13 : defaultGlobeViewport.zoom,
    })

    instance.addControl(
      new NavigationControl({ showCompass: false }),
      'bottom-right',
    )

    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: false,
    })
    instance.addControl(geolocate, 'top-right')

    if (initialCoordinates.current) {
      marker.current = createLocationMarker(
        instance,
        initialCoordinates.current,
        onChangeRef,
      )
    }

    const moveToPosition = (coordinates: [number, number]) => {
      if (!marker.current) {
        marker.current = createLocationMarker(
          instance,
          coordinates,
          onChangeRef,
        )
      } else {
        marker.current.setLngLat(coordinates)
      }
      instance.flyTo({ center: coordinates, zoom: 15 })
      onChangeRef.current(coordinates)
    }

    instance.on('click', (event) => {
      moveToPosition([event.lngLat.lng, event.lngLat.lat])
    })

    const onLocate = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      void getCurrentDevicePosition().then(
        ({ coords }) => moveToPosition([coords.longitude, coords.latitude]),
        () => undefined,
      )
    }

    const locateButton = instance
      .getContainer()
      .querySelector<HTMLButtonElement>('.maplibregl-ctrl-geolocate')
    locateButton?.addEventListener('click', onLocate, true)

    map.current = instance

    return () => {
      map.current = null
      marker.current = null
      locateButton?.removeEventListener('click', onLocate, true)
      instance.remove()
    }
  }, [])

  return (
    <div
      ref={mapContainer}
      role="application"
      aria-label="Pick the discovery location on the map"
      className={className}
    />
  )
})

function createLocationMarker(
  map: Map,
  coordinates: [number, number],
  onChangeRef: { current: (coordinates: [number, number]) => void },
): Marker {
  const marker = new Marker({ draggable: true, color: '#2d5a3d' })
    .setLngLat(coordinates)
    .addTo(map)
  marker.on('dragend', () => {
    const { lng, lat } = marker.getLngLat()
    onChangeRef.current([lng, lat])
  })
  return marker
}
