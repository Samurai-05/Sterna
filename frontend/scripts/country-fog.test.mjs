import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  SMALL_WATER_HOLE_AREA_KM2,
  createCountriesFog,
  countInteriorRings,
  ringAreaKm2,
} from './country-fog.mjs'

const source = JSON.parse(
  readFileSync('../api/src/countries/countries.geo.json', 'utf8'),
)
const committedFog = JSON.parse(
  readFileSync('public/countries-fog.geo.json', 'utf8'),
)

function polygonFeature(A3, coordinates, extra = {}) {
  return {
    type: 'Feature',
    properties: { A3, ...extra },
    geometry: { type: 'Polygon', coordinates },
  }
}

function interiorRingAreas(collection, A3) {
  const feature = collection.features.find(
    (candidate) => candidate.properties.A3 === A3,
  )
  const polygons =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates

  return polygons
    .slice()
    .flatMap((polygon) => polygon.slice(1).map((ring) => ringAreaKm2(ring)))
}

function outerRings(feature) {
  return feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates[0]]
    : feature.geometry.coordinates.map((polygon) => polygon[0])
}

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

function hasContainedFeature(collection, containerCode, containedCode) {
  const container = collection.features.find(
    (feature) => feature.properties.A3 === containerCode,
  )
  const contained = collection.features.find(
    (feature) => feature.properties.A3 === containedCode,
  )

  const containerHoles =
    container.geometry.type === 'Polygon'
      ? container.geometry.coordinates.slice(1)
      : container.geometry.coordinates.flatMap((polygon) => polygon.slice(1))

  return containerHoles.some((hole) =>
    outerRings(contained).some((ring) => {
      const holeBounds = ringBounds(hole)
      const containedBounds = ringBounds(ring)

      return (
        containedBounds.minLongitude >= holeBounds.minLongitude &&
        containedBounds.maxLongitude <= holeBounds.maxLongitude &&
        containedBounds.minLatitude >= holeBounds.minLatitude &&
        containedBounds.maxLatitude <= holeBounds.maxLatitude &&
        ring.some((point) => coordinateInRing(point, hole))
      )
    }),
  )
}

describe('countries fog preparation', () => {
  it('removes only small unclassified holes and preserves significant holes', () => {
    const smallHole = [
      [1, 1],
      [1.01, 1],
      [1.01, 1.01],
      [1, 1.01],
      [1, 1],
    ]
    const largeHole = [
      [2, 2],
      [2.2, 2],
      [2.2, 2.2],
      [2, 2.2],
      [2, 2],
    ]
    const input = {
      type: 'FeatureCollection',
      features: [
        polygonFeature('AAA', [
          [
            [0, 0],
            [5, 0],
            [5, 5],
            [0, 5],
            [0, 0],
          ],
          smallHole,
          largeHole,
        ]),
      ],
    }

    const output = createCountriesFog(input)
    const holes = output.features[0].geometry.coordinates.slice(1)

    expect(holes).toHaveLength(1)
    expect(holes[0]).toEqual(largeHole)
    expect(countInteriorRings(source)).toBeGreaterThan(
      countInteriorRings(createCountriesFog(source)),
    )
    expect(SMALL_WATER_HOLE_AREA_KM2).toBe(100)
  })

  it('keeps a small hole when it contains a separate country feature', () => {
    const enclaveHole = [
      [1, 1],
      [1.01, 1],
      [1.01, 1.01],
      [1, 1.01],
      [1, 1],
    ]
    const input = {
      type: 'FeatureCollection',
      features: [
        polygonFeature(
          'AAA',
          [
            [
              [0, 0],
              [5, 0],
              [5, 5],
              [0, 5],
              [0, 0],
            ],
            enclaveHole,
          ],
          { name: 'Parent' },
        ),
        polygonFeature(
          'BBB',
          [
            [
              [1.002, 1.002],
              [1.008, 1.002],
              [1.008, 1.008],
              [1.002, 1.008],
              [1.002, 1.002],
            ],
          ],
          { name: 'Enclave' },
        ),
      ],
    }

    const output = createCountriesFog(input)

    expect(output.features[0].geometry.coordinates).toHaveLength(2)
    expect(output.features.map((feature) => feature.properties.A3)).toEqual([
      'AAA',
      'BBB',
    ])
    expect(output.features[0].properties).toMatchObject({
      A3: 'AAA',
      name: 'Parent',
    })
  })

  it('is deterministic and does not mutate the semantic collection', () => {
    const before = JSON.stringify(source)

    expect(createCountriesFog(source)).toEqual(createCountriesFog(source))
    expect(JSON.stringify(source)).toBe(before)
  })

  it('keeps the committed fog asset synchronized with the semantic source', () => {
    expect(committedFog).toEqual(createCountriesFog(source))
  })

  it('preserves the real Büsingen enclave inside Switzerland', () => {
    const fog = createCountriesFog(source)

    // Büsingen am Hochrhein is a small German enclave represented by a hole
    // in Switzerland in this source, so it must not be mistaken for a lake.
    expect(hasContainedFeature(fog, 'CHE', 'DEU')).toBe(true)
  })

  it('retains significant lakes in the real visual source', () => {
    const fog = createCountriesFog(source)

    // These source rings are the visual-scale checks for the issue's lake
    // cases: Lake Geneva, large Finnish lakes and a Great Lakes polygon.
    expect(interiorRingAreas(fog, 'CHE').some((area) => area > 200)).toBe(true)
    expect(interiorRingAreas(fog, 'FIN').some((area) => area > 1000)).toBe(true)
    expect(interiorRingAreas(fog, 'CAN').some((area) => area > 20000)).toBe(
      true,
    )
  })
})
