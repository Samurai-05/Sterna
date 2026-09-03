import { useEffect, useMemo, useState } from 'react'

import { mapExploredCountryCodes } from '@/lib/profile-analytics'
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  projectCountryGeometry,
  type CountryGeometry,
} from '@/lib/profile-world-map'

type CountryFeature = {
  properties?: { A3?: string }
  geometry?: CountryGeometry
}

type CountryCollection = { features?: CountryFeature[] }

type PreparedCountry = { code: string; path: string; key: string }

export function ProfileWorldMap({
  exploredCountryCodes,
}: {
  exploredCountryCodes: string[]
}) {
  const [countries, setCountries] = useState<PreparedCountry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    void fetch('/countries-fog.geo.json')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load country geometry.')
        return response.json() as Promise<CountryCollection>
      })
      .then((collection) => {
        if (!active) return
        setCountries(prepareCountries(collection.features ?? []))
        setIsLoading(false)
      })
      .catch(() => {
        if (active) {
          setHasError(true)
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [requestVersion])

  const explored = useMemo(
    () => new Set(mapExploredCountryCodes(exploredCountryCodes)),
    [exploredCountryCodes],
  )

  if (isLoading) {
    return (
      <div
        className="flex h-44 items-center justify-center rounded-2xl border border-border bg-secondary text-sm text-muted-foreground"
        role="status"
        aria-label="Loading world exploration map"
      >
        Loading world map…
      </div>
    )
  }

  if (hasError) {
    return (
      <div
        className="rounded-2xl border border-border bg-secondary px-4 py-6 text-center"
        role="status"
      >
        <p className="text-sm text-muted-foreground">
          The world map is temporarily unavailable.
        </p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true)
            setHasError(false)
            setRequestVersion((version) => version + 1)
          }}
          className="mt-3 min-h-11 rounded-xl px-4 text-sm font-semibold text-primary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-secondary px-2 py-3">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label="World exploration map"
        aria-describedby="profile-world-map-description"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {countries.map((country) => (
          <path
            key={country.key}
            data-testid={`profile-country-${country.code}`}
            d={country.path}
            fill={explored.has(country.code) ? '#2D5A3D' : '#E8E3D9'}
            fillRule="evenodd"
            stroke="#D4CEC4"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <p id="profile-world-map-description" className="sr-only">
        Green countries have discoveries. Warm neutral countries have not been
        explored yet.
      </p>
    </div>
  )
}

function prepareCountries(features: CountryFeature[]): PreparedCountry[] {
  return features.flatMap((country, index) => {
    const code = country.properties?.A3?.trim().toUpperCase()
    if (!code || !country.geometry) return []

    return [
      {
        code,
        path: projectCountryGeometry(country.geometry),
        key: `${code}-${index}`,
      },
    ]
  })
}
