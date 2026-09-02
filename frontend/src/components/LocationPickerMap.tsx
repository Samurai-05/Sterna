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

import {
  getCurrentDevicePosition,
  isNativeAndroid,
} from '@/lib/device-location'

setWorkerUrl(maplibreWorkerUrl)

const mapStyle = 'https://tiles.openfreemap.org/styles/bright'

export interface LocationPickerMapHandle {
  /** Recenters the map and moves the pin without waiting for a tap/drag. */
  flyTo: (coordinates: [number, number], zoom?: number) => void
}

interface LocationPickerMapProps {
  coordinates: [number, number]
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
      marker.current?.setLngLat(nextCoordinates)
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
      center: initialCoordinates.current,
      zoom: 13,
    })

    instance.addControl(
      new NavigationControl({ showCompass: false }),
      'bottom-right',
    )

    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    })
    instance.addControl(geolocate, 'top-right')

    const pin = new Marker({ draggable: true, color: '#2d5a3d' })
      .setLngLat(initialCoordinates.current)
      .addTo(instance)

    pin.on('dragend', () => {
      const { lng, lat } = pin.getLngLat()
      onChangeRef.current([lng, lat])
    })

    const moveToPosition = (coordinates: [number, number]) => {
      pin.setLngLat(coordinates)
      instance.flyTo({ center: coordinates, zoom: 15 })
      onChangeRef.current(coordinates)
    }

    instance.on('click', (event) => {
      pin.setLngLat(event.lngLat)
      onChangeRef.current([event.lngLat.lng, event.lngLat.lat])
    })

    geolocate.on('geolocate', (event) => {
      const { longitude, latitude } = event.coords
      moveToPosition([longitude, latitude])
    })

    let nativeLocateButton: HTMLButtonElement | null = null
    const onNativeLocate = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      void getCurrentDevicePosition().then(
        ({ coords }) => moveToPosition([coords.longitude, coords.latitude]),
        () => undefined,
      )
    }

    if (isNativeAndroid()) {
      nativeLocateButton = instance
        .getContainer()
        .querySelector<HTMLButtonElement>('.maplibregl-ctrl-geolocate')
      nativeLocateButton?.addEventListener('click', onNativeLocate, true)
    }

    map.current = instance
    marker.current = pin

    return () => {
      map.current = null
      marker.current = null
      nativeLocateButton?.removeEventListener('click', onNativeLocate, true)
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
