import { describe, expect, it } from 'vitest'

import { discoveryLocationLabel, landmarkLocationLabel } from './location-label'

describe('location labels', () => {
  it('uses a discovery country instead of its coordinates', () => {
    expect(discoveryLocationLabel({ countryCode: 'CHE' })).toBe('Switzerland')
    expect(discoveryLocationLabel({ countryCode: 'UNK' })).toBe(
      'Unknown country',
    )
  })

  it('uses the most precise POI place without falling back to coordinates', () => {
    expect(landmarkLocationLabel({ city: 'Paris', country: 'France' })).toBe(
      'Paris, France',
    )
    expect(landmarkLocationLabel({ city: '', country: 'France' })).toBe(
      'France',
    )
    expect(landmarkLocationLabel({ city: '', country: '' })).toBe(
      'Unknown country',
    )
  })
})
