import { describe, expect, it } from 'vitest'

import { COUNTRY_COUNT, getCountryFlagCode } from './countries'

describe('country flags', () => {
  it('matches the number of geographic destinations supported by Sterna', () => {
    expect(COUNTRY_COUNT).toBe(221)
  })

  it('converts canonical and custom A3 codes to SVG file codes', () => {
    expect(getCountryFlagCode('FRA')).toBe('fr')
    expect(getCountryFlagCode(' che ')).toBe('ch')
    expect(getCountryFlagCode('XKX')).toBe('xk')
    expect(getCountryFlagCode('XWS')).toBe('eh')
  })

  it('keeps a neutral fallback for codes without an ISO country flag', () => {
    expect(getCountryFlagCode('XCR')).toBeNull()
    expect(getCountryFlagCode('UNK')).toBeNull()
  })
})
