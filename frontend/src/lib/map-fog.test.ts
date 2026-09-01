import { describe, expect, it } from 'vitest'

import {
  fogColor,
  fogMaxZoom,
  fogOpacityExpression,
  fogSourceId,
  getFogInsertionBeforeLayerId,
} from './map-fog'

describe('map fog configuration', () => {
  it('uses a continuous zoom expression while keeping explored countries clear', () => {
    expect(fogSourceId).toBe('countries-fog')
    expect(fogColor).toBe('#2f4439')
    expect(fogMaxZoom).toBe(9)
    expect(fogOpacityExpression).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      1.5,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.52],
      5,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.52],
      6,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.44],
      7,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.25],
      8,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0, 0.08],
      8.5,
      0,
    ])
  })

  it('places fog below native boundaries and falls back to labels', () => {
    expect(
      getFogInsertionBeforeLayerId([
        { id: 'roads', type: 'line', 'source-layer': 'transportation' },
        { id: 'native-admin', type: 'line', 'source-layer': 'boundary' },
        { id: 'places', type: 'symbol' },
      ]),
    ).toBe('native-admin')

    expect(
      getFogInsertionBeforeLayerId([
        { id: 'roads', type: 'line', 'source-layer': 'transportation' },
        { id: 'places', type: 'symbol' },
      ]),
    ).toBe('places')

    expect(
      getFogInsertionBeforeLayerId([
        { id: 'early-label', type: 'symbol' },
        { id: 'native-admin', type: 'line', 'source-layer': 'boundary' },
      ]),
    ).toBe('early-label')

    // Bright and Positron use different transport layer IDs, but both expose
    // the same native boundary source-layer contract.
    expect(
      getFogInsertionBeforeLayerId([
        {
          id: 'highway_major_subtle',
          type: 'line',
          'source-layer': 'transportation',
        },
        { id: 'boundary_3', type: 'line', 'source-layer': 'boundary' },
        { id: 'label_country_1', type: 'symbol', 'source-layer': 'place' },
      ]),
    ).toBe('boundary_3')
  })
})
