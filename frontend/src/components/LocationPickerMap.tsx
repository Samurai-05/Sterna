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

// Lets the user drop/drag a pin instead of typing coordinates. The map is
// created once, while the marker follows controlled `coordinates` updates.
export function LocationPickerMap({
  coordinates,
  onChange,
  className,
}: LocationPickerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const pin = useRef<Marker | null>(null)
  const initialCoordinates = useRef(coordinates)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

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

    const marker = new Marker({ draggable: true, color: '#2d5a3d' })
      .setLngLat(initialCoordinates.current)
      .addTo(instance)

    map.current = instance
    pin.current = marker

    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat()
      onChangeRef.current([lng, lat])
    })

    instance.on('click', (event) => {
      marker.setLngLat(event.lngLat)
      onChangeRef.current([event.lngLat.lng, event.lngLat.lat])
    })

    geolocate.on('geolocate', (event) => {
      const { longitude, latitude } = event.coords
      marker.setLngLat([longitude, latitude])
      instance.flyTo({ center: [longitude, latitude], zoom: 15 })
      onChangeRef.current([longitude, latitude])
    })

    return () => {
      map.current = null
      pin.current = null
      instance.remove()
    }
  }, [])

  useEffect(() => {
    const instance = map.current
    const marker = pin.current
    if (!instance || !marker) return

    const current = marker.getLngLat()
    if (current.lng === coordinates[0] && current.lat === coordinates[1]) {
      return
    }

    marker.setLngLat(coordinates)
    instance.flyTo({ center: coordinates })
  }, [coordinates])

  return (
    <div
      ref={mapContainer}
      role="application"
      aria-label="Pick the discovery location on the map"
      className={className}
    />
  )
}
