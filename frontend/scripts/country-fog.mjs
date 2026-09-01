export const SMALL_WATER_HOLE_AREA_KM2 = 100

const EARTH_KM_PER_DEGREE = 111.32

function ringBounds(ring) {
  return ring.reduce(
    (bounds, [longitude, latitude]) => ({
      minLongitude: Math.min(bounds.minLongitude, longitude),
      minLatitude: Math.min(bounds.minLatitude, latitude),
      maxLongitude: Math.max(bounds.maxLongitude, longitude),
      maxLatitude: Math.max(bounds.maxLatitude, latitude),
    }),
    {
      minLongitude: Infinity,
      minLatitude: Infinity,
      maxLongitude: -Infinity,
      maxLatitude: -Infinity,
    },
  )
}

function coordinateInRing([longitude, latitude], ring) {
  let inside = false

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [currentLongitude, currentLatitude] = ring[index]
    const [previousLongitude, previousLatitude] = ring[previous]
    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude

    if (intersects) inside = !inside
  }

  return inside
}

/** Approximate geodesic area is sufficient for an offline noise threshold. */
export function ringAreaKm2(ring) {
  let twiceArea = 0
  let meanLatitude = 0

  for (const [, latitude] of ring) meanLatitude += latitude
  meanLatitude /= ring.length

  for (let index = 1; index < ring.length; index++) {
    twiceArea +=
      ring[index - 1][0] * ring[index][1] - ring[index][0] * ring[index - 1][1]
  }

  return (
    Math.abs(twiceArea / 2) *
    EARTH_KM_PER_DEGREE ** 2 *
    Math.cos((meanLatitude * Math.PI) / 180)
  )
}

function getOuterRings(feature) {
  if (feature.geometry.type === 'Polygon') {
    return [feature.geometry.coordinates[0]]
  }

  return feature.geometry.coordinates.map((polygon) => polygon[0])
}

function createFeatureIndex(features) {
  return features.map((feature) => {
    const outerRings = getOuterRings(feature).map((ring) => ({
      coordinates: ring,
      bounds: ringBounds(ring),
    }))

    return { code: feature.properties?.A3, outerRings }
  })
}

function featureContainsRingPoint(feature, ring, holeBounds) {
  return feature.outerRings.some(
    ({ coordinates, bounds }) =>
      bounds.minLongitude >= holeBounds.minLongitude &&
      bounds.maxLongitude <= holeBounds.maxLongitude &&
      bounds.minLatitude >= holeBounds.minLatitude &&
      bounds.maxLatitude <= holeBounds.maxLatitude &&
      coordinates.some((point) => coordinateInRing(point, ring)),
  )
}

function isMeaningfulInteriorArea(hole, ownerCode, featureIndex) {
  if (ringAreaKm2(hole) >= SMALL_WATER_HOLE_AREA_KM2) return true
  const holeBounds = ringBounds(hole)

  // A small ring containing a separate feature is an enclave/microstate (or
  // another meaningful land area), not an unclassified lake. Keep it even if
  // its area is below the visual-noise threshold.
  return featureIndex.some(
    (feature) =>
      feature.code !== ownerCode &&
      featureContainsRingPoint(feature, hole, holeBounds),
  )
}

function cleanGeometry(geometry, ownerCode, featureIndex) {
  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: [
        geometry.coordinates[0],
        ...geometry.coordinates
          .slice(1)
          .filter((hole) =>
            isMeaningfulInteriorArea(hole, ownerCode, featureIndex),
          ),
      ],
    }
  }

  return {
    ...geometry,
    coordinates: geometry.coordinates.map((polygon) => [
      polygon[0],
      ...polygon
        .slice(1)
        .filter((hole) =>
          isMeaningfulInteriorArea(hole, ownerCode, featureIndex),
        ),
    ]),
  }
}

export function createCountriesFog(collection) {
  const featureIndex = createFeatureIndex(collection.features)

  return {
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      properties: { ...feature.properties },
      geometry: cleanGeometry(
        feature.geometry,
        feature.properties?.A3,
        featureIndex,
      ),
    })),
  }
}

export function countInteriorRings(collection) {
  return collection.features.reduce((count, feature) => {
    if (feature.geometry.type === 'Polygon') {
      return count + Math.max(feature.geometry.coordinates.length - 1, 0)
    }

    return (
      count +
      feature.geometry.coordinates.reduce(
        (polygonCount, polygon) =>
          polygonCount + Math.max(polygon.length - 1, 0),
        0,
      )
    )
  }, 0)
}
