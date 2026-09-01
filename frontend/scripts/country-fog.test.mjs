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
