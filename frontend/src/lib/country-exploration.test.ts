import { describe, expect, it } from 'vitest'

import {
  expandedExploredCountryCodes,
  normalizeExploredCountryCodes,
} from './country-exploration'

describe('country exploration state', () => {
  it('normalizes country codes and expands disputed zones consistently', () => {
    expect(normalizeExploredCountryCodes([' fra ', 'FRA', '', 'che'])).toEqual([
      'FRA',
      'CHE',
    ])
    expect(expandedExploredCountryCodes(['UKR'])).toEqual(['UKR', 'XCR'])
    expect(expandedExploredCountryCodes(['ESH'])).toEqual(['ESH', 'XWS'])
  })

  it('does not expand a disputed zone when neither claim is explored', () => {
    expect(expandedExploredCountryCodes(['FRA'])).toEqual(['FRA'])
  })
})
