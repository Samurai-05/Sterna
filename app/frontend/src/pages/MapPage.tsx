import { Geolocation } from '@capacitor/geolocation'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'

const defaultCenter: [number, number] = [6.9275, 46.4142]

maplibregl.setWorkerUrl(workerUrl)

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const [locationMessage, setLocationMessage] = useState('')

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: defaultCenter,
      zoom: 8,
    })

    map.addControl(new maplibregl.NavigationControl())
    mapRef.current = map

    return () => {
      markerRef.current?.remove()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  async function locateMe() {
    setLocationMessage('Requesting location…')

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      })
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      const coordinates: [number, number] = [longitude, latitude]
      const map = mapRef.current

      if (!map) {
        setLocationMessage('Map is still initializing. Please try again.')
        return
      }

      let marker = markerRef.current

      if (!marker) {
        marker = new maplibregl.Marker().setLngLat(coordinates).addTo(map)
        markerRef.current = marker
      } else {
        marker.setLngLat(coordinates)
      }

      map.flyTo({ center: coordinates, zoom: 14 })
      setLocationMessage(
        `Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(position.coords.accuracy)} m)`,
      )
    } catch (error) {
      setLocationMessage(
        `Unable to get location: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return (
    <main>
      <h1>Map</h1>
      <p>MapLibre GL JS with the OpenFreeMap Liberty style.</p>
      <p>
        <button type="button" onClick={() => void locateMe()}>
          Locate me
        </button>
      </p>
      {locationMessage && <p role="status">{locationMessage}</p>}
      <div className="map" ref={containerRef} aria-label="Interactive map" />
    </main>
  )
}
