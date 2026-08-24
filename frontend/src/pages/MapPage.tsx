import { useEffect, useRef } from 'react'
import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(maplibreWorkerUrl)

const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainer.current) {
      return
    }

    const map = new Map({
      container: mapContainer.current,
      style: OPEN_FREE_MAP_STYLE,
      center: [8.5417, 47.3769],
      zoom: 10,
    })

    map.addControl(new NavigationControl(), 'top-right')

    return () => map.remove()
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Map smoke test
        </h1>
        <p className="text-muted-foreground">
          MapLibre GL JS using the public OpenFreeMap Liberty style.
        </p>
      </div>
      <div
        ref={mapContainer}
        aria-label="Map smoke test"
        className="h-[65vh] min-h-96 w-full overflow-hidden rounded-lg border"
      />
    </main>
  )
}
