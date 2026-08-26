type Position = [number, number]

interface CountryFeatureCollection {
  features: CountryFeature[]
}

interface CountryFeature {
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: Position[][] | Position[][][]
  }
  properties: {
    A3?: string
  }
}

let countriesPromise: Promise<CountryFeature[]> | null = null

export async function findCountryCodeForPoint(
  point: Position,
): Promise<string | null> {
  const countries = await loadCountries()
  const country = countries.find((feature) => containsPoint(feature, point))

  return country?.properties.A3 ?? null
}

async function loadCountries(): Promise<CountryFeature[]> {
  countriesPromise ??= fetch('/countries.geo.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Unable to load country boundaries.')
      }

      return response.json() as Promise<CountryFeatureCollection>
    })
    .then((collection) => collection.features)

  return countriesPromise
}

function containsPoint(feature: CountryFeature, point: Position): boolean {
  if (feature.geometry.type === 'Polygon') {
    return isInsidePolygon(point, feature.geometry.coordinates as Position[][])
  }

  return (feature.geometry.coordinates as Position[][][]).some((polygon) =>
    isInsidePolygon(point, polygon),
  )
}

function isInsidePolygon(point: Position, polygon: Position[][]): boolean {
  const [outerRing, ...holes] = polygon

  if (!outerRing || !isInsideRing(point, outerRing)) {
    return false
  }

  return !holes.some((hole) => isInsideRing(point, hole))
}

function isInsideRing([longitude, latitude]: Position, ring: Position[]) {
  let inside = false

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [longitudeA, latitudeA] = ring[index]
    const [longitudeB, latitudeB] = ring[previous]
    const intersects =
      latitudeA > latitude !== latitudeB > latitude &&
      longitude <
        ((longitudeB - longitudeA) * (latitude - latitudeA)) /
          (latitudeB - latitudeA) +
          longitudeA

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}
