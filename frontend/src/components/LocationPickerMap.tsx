import { useEffect, useRef } from 'react'
import {
  GeolocateControl,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(maplibreWorkerUrl)

const mapStyle = 'https://tiles.openfreemap.org/styles/bright'

interface LocationPickerMapProps {
  coordinates: [number, number]
  onChange: (coordinates: [number, number]) => void
  className?: string
}

// Lets the user drop/drag a pin instead of typing coordinates. Initial
// position only (the map is only created once, like MapCanvas) — later
// `coordinates` updates from outside (e.g. a parent resetting the form)
// aren't reflected back onto the pin.
export function LocationPickerMap({
  coordinates,
  onChange,
  className,
}: LocationPickerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const initialCoordinates = useRef(coordinates)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

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

    instance.on('click', (event) => {
      pin.setLngLat(event.lngLat)
      onChangeRef.current([event.lngLat.lng, event.lngLat.lat])
    })

    geolocate.on('geolocate', (event) => {
      const { longitude, latitude } = event.coords
      pin.setLngLat([longitude, latitude])
      instance.flyTo({ center: [longitude, latitude], zoom: 15 })
      onChangeRef.current([longitude, latitude])
    })

    return () => {
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
}
