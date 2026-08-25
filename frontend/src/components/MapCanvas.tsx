import { useEffect, useRef } from 'react'
import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(maplibreWorkerUrl)

const openFreeMapStyle = 'https://tiles.openfreemap.org/styles/liberty'

export function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainer.current || navigator.userAgent.includes('jsdom')) {
      return
    }

    const map = new Map({
      container: mapContainer.current,
      style: openFreeMapStyle,
      center: [2.3522, 48.8566],
      zoom: 12,
    })

    map.addControl(
      new NavigationControl({ showCompass: false }),
      'bottom-right',
    )

    return () => map.remove()
  }, [])

  return (
    <div
      ref={mapContainer}
      aria-label="Interactive map"
      className="absolute inset-0"
    />
  )
}
