import { describe, expect, it } from 'vitest'

import {
  countryStateColorExpression,
  countryStateMaxZoom,
  countryStateOpacityExpression,
  fogSourceId,
  getFogInsertionBeforeLayerId,
} from './map-fog'

describe('country state map styling', () => {
  it('gives explored and unexplored countries distinct intentional colors', () => {
    expect(fogSourceId).toBe('countries-fog')
    expect(countryStateColorExpression).toEqual([
      'case',
      ['boolean', ['feature-state', 'explored'], false],
      '#7EA678',
      '#5F6F66',
    ])
  })

  it('keeps states distinct at world view and progressively fades both before detail zoom', () => {
    expect(countryStateMaxZoom).toBe(9)
    expect(countryStateOpacityExpression).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      1.5,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0.48, 0.5],
      5,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0.48, 0.5],
      6,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0.4, 0.42],
      7,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0.22, 0.24],
      8,
      ['case', ['boolean', ['feature-state', 'explored'], false], 0.06, 0.07],
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
  })
})
