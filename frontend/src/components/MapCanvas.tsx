import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Trophy } from 'lucide-react'
import {
  GeolocateControl,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { CategoryIcon } from '@/components/CategoryIcon'
import type { DiscoveryCategory } from '@/lib/mock-data'

setWorkerUrl(maplibreWorkerUrl)

const exploredStyle = 'https://tiles.openfreemap.org/styles/bright'
const unexploredStyle = 'https://tiles.openfreemap.org/styles/fiord'
const maskId = 'explored-country-mask'

async function loadStyle(url: string): Promise<StyleSpecification> {
  const response = await fetch(url)
  return (await response.json()) as StyleSpecification
}

// Strips a style down to its colors/terrain/roads only, no text. Used for
// the two stacked base maps so place names are never drawn twice by two
// independently-running label engines.
function withoutLabels(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.map((layer) =>
    layer.type === 'symbol'
      ? { ...layer, layout: { ...layer.layout, visibility: 'none' } }
      : layer,
  )
  return { ...style, layers } as StyleSpecification
}

// Strips a style down to its text layers only, boosting the halo so labels
// stay legible over both the bright and fiord base maps beneath them. This
// is the single source of every place name on the map.
function onlyLabels(style: StyleSpecification): StyleSpecification {
  const layers = style.layers
    .filter((layer) => layer.type !== 'background')
    .map((layer) =>
      layer.type === 'symbol'
        ? {
            ...layer,
            paint: {
              ...layer.paint,
              'text-halo-color': 'rgba(255,255,255,0.9)',
              'text-halo-width': 2,
            },
          }
        : { ...layer, layout: { ...layer.layout, visibility: 'none' } },
    )
  return { ...style, layers } as StyleSpecification
}

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

interface CountryFeature {
  properties: { A3?: string }
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] }
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
    const exploredContainer = useRef<HTMLDivElement>(null)
    const unexploredContainer = useRef<HTMLDivElement>(null)
    const labelsContainer = useRef<HTMLDivElement>(null)
    const exploredMap = useRef<Map | null>(null)
    const geolocateControl = useRef<GeolocateControl | null>(null)
    const maskPath = useRef<SVGPathElement>(null)
    const countryFeatures = useRef<CountryFeature[]>([])
    const exploredCodes = useRef<string[]>(exploredCountryCodes)
    const updateMaskRef = useRef<() => void>(() => {})
    const disposeRef = useRef<() => void>(() => {})
    const [mapReady, setMapReady] = useState(false)

    useImperativeHandle(ref, () => ({
      locate: () => geolocateControl.current?.trigger(),
    }))

    // The country-boundary mask is projected relative to the explored (bright)
    // map's camera, so it stays aligned as that map pans/zooms.
    useEffect(() => {
      if (
        !exploredContainer.current ||
        !unexploredContainer.current ||
        !labelsContainer.current ||
        navigator.userAgent.includes('jsdom')
      ) {
        return
      }

      let cancelled = false

      Promise.all([loadStyle(exploredStyle), loadStyle(unexploredStyle)]).then(
        ([brightStyle, fiordStyle]) => {
          if (
            cancelled ||
            !exploredContainer.current ||
            !unexploredContainer.current ||
            !labelsContainer.current
          ) {
            return
          }

          const bright = new Map({
            container: exploredContainer.current,
            style: withoutLabels(brightStyle),
            center: [2.3522, 48.8566],
            zoom: 12,
          })

          const fiord = new Map({
            container: unexploredContainer.current,
            style: withoutLabels(fiordStyle),
            center: [2.3522, 48.8566],
            zoom: 12,
            interactive: false,
            attributionControl: false,
          })

          // A single, unmasked map that owns every place name, so labels
          // are never placed twice by two independently-running label
          // engines (which used to produce garbled overlaps at borders,
          // e.g. "ANDORra").
          const labels = new Map({
            container: labelsContainer.current,
            style: onlyLabels(brightStyle),
            center: [2.3522, 48.8566],
            zoom: 12,
            interactive: false,
            attributionControl: false,
          })

          bright.addControl(
            new NavigationControl({ showCompass: false }),
            'bottom-right',
          )

          const geolocate = new GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
          })
          bright.addControl(geolocate, 'top-left')
          geolocateControl.current = geolocate

          const updateMask = () => {
            if (!maskPath.current) {
              return
            }
            // The mask's base (a huge white rect, see the JSX below) keeps
            // everything shown by default, including the ocean, which
            // belongs to no country. This path punches black holes over
            // unexplored countries only, revealing the fiord map beneath
            // just there.
            const codes = new Set(exploredCodes.current)
            let d = ''
            for (const feature of countryFeatures.current) {
              const code = feature.properties?.A3
              if (!code || codes.has(code)) {
                continue
              }
              const polygons =
                feature.geometry.type === 'Polygon'
                  ? [feature.geometry.coordinates]
                  : feature.geometry.coordinates
              for (const polygon of polygons) {
                for (const ring of polygon) {
                  const points = ring.map(([lng, lat]) =>
                    bright.project([lng, lat]),
                  )
                  if (points.length === 0) {
                    continue
                  }
                  d += `M${points[0].x},${points[0].y} `
                  for (let i = 1; i < points.length; i++) {
                    d += `L${points[i].x},${points[i].y} `
                  }
                  d += 'Z '
                }
              }
            }
            maskPath.current.setAttribute('d', d)
          }
          updateMaskRef.current = updateMask

          const syncSecondary = () => {
            const camera = {
              center: bright.getCenter(),
              zoom: bright.getZoom(),
              bearing: bright.getBearing(),
              pitch: bright.getPitch(),
            }
            fiord.jumpTo(camera)
            labels.jumpTo(camera)
            updateMask()
          }

          bright.on('move', syncSecondary)
          bright.on('resize', syncSecondary)
          bright.once('load', syncSecondary)

          // Mask only the rendered tiles, not the markers/controls layered
          // on top, so pins and the geolocate dot stay visible everywhere.
          const canvas = bright.getCanvas()
          canvas.style.maskImage = `url(#${maskId})`
          canvas.style.webkitMaskImage = `url(#${maskId})`

          exploredMap.current = bright
          setMapReady(true)

          disposeRef.current = () => {
            bright.off('move', syncSecondary)
            bright.off('resize', syncSecondary)
            updateMaskRef.current = () => {}
            geolocateControl.current = null
            exploredMap.current = null
            bright.remove()
            fiord.remove()
            labels.remove()
          }
        },
      )

      return () => {
        cancelled = true
        disposeRef.current()
        disposeRef.current = () => {}
        setMapReady(false)
      }
    }, [])

    useEffect(() => {
      exploredCodes.current = exploredCountryCodes
      updateMaskRef.current()
    }, [exploredCountryCodes])

    useEffect(() => {
      if (navigator.userAgent.includes('jsdom')) {
        return
      }
      let cancelled = false
      fetch('/countries.geo.json')
        .then((res) => res.json())
        .then((data: { features: CountryFeature[] }) => {
          if (!cancelled) {
            countryFeatures.current = data.features
            updateMaskRef.current()
          }
        })
      return () => {
        cancelled = true
      }
    }, [])

    useEffect(() => {
      const instance = exploredMap.current
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
    }, [discoveries, landmarks, onSelectDiscovery, onSelectLandmark, mapReady])

    return (
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          <div ref={unexploredContainer} className="h-full w-full" />
        </div>
        <div className="absolute inset-0">
          <div
            ref={exploredContainer}
            aria-label="Interactive map"
            className="h-full w-full [&_.maplibregl-ctrl-top-left]:hidden"
          />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div ref={labelsContainer} className="h-full w-full" />
        </div>
        <svg
          width="0"
          height="0"
          style={{ position: 'absolute' }}
          aria-hidden="true"
        >
          <defs>
            <mask id={maskId}>
              <rect
                x={-100000}
                y={-100000}
                width={200000}
                height={200000}
                fill="white"
              />
              <path ref={maskPath} fill="black" />
            </mask>
          </defs>
        </svg>
      </div>
    )
  },
)
