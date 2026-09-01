import { useEffect, useState } from 'react'

const MAP_WIDTH = 1000
const MAP_HEIGHT = 500
const MAP_PADDING = 12

type Coordinate = [number, number]

type CountryFeature = {
  properties?: { A3?: string }
  geometry?:
    | { type: 'Polygon'; coordinates: Coordinate[][] }
    | { type: 'MultiPolygon'; coordinates: Coordinate[][][] }
}

type CountryCollection = {
  features?: CountryFeature[]
}

export function ProfileWorldMap({
  exploredCountryCodes,
}: {
  exploredCountryCodes: string[]
}) {
  const [countries, setCountries] = useState<CountryFeature[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    void fetch('/countries.geo.json')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load country geometry.')
        return response.json() as Promise<CountryCollection>
      })
      .then((collection) => {
        if (!active) return
        setCountries(collection.features ?? [])
        setIsLoading(false)
      })
      .catch(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const explored = new Set(
    exploredCountryCodes.map((code) => code.trim().toUpperCase()),
  )

  return (
    <div
      className="overflow-hidden rounded-2xl bg-[#F0EEE8] px-2 py-3"
      aria-busy={isLoading}
    >
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label="World exploration map"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {countries.map((country, index) => {
          const code = country.properties?.A3?.toUpperCase()
          if (!code || !country.geometry) return null

          return (
            <path
              key={`${code}-${index}`}
              data-testid={`profile-country-${code}`}
              d={geometryPath(country.geometry)}
              fill={explored.has(code) ? '#2D5A3D' : '#E8E3D9'}
              stroke="#D4CEC4"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          )
        })}
      </svg>
    </div>
  )
}

function geometryPath(
  geometry: Exclude<CountryFeature['geometry'], undefined>,
): string {
  const rings =
    geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.coordinates.flat()

  return rings.map(ringPath).join(' ')
}

function ringPath(ring: Coordinate[]): string {
  return ring
    .map(([longitude, latitude], index) => {
      const x = projectLongitude(longitude)
      const y = projectLatitude(latitude)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .concat('Z')
    .join(' ')
}

function projectLongitude(longitude: number): number {
  return MAP_PADDING + ((longitude + 180) / 360) * (MAP_WIDTH - MAP_PADDING * 2)
}

function projectLatitude(latitude: number): number {
  return MAP_PADDING + ((90 - latitude) / 180) * (MAP_HEIGHT - MAP_PADDING * 2)
}
