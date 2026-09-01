import { describe, expect, it } from 'vitest'

import { personalMapName } from './personal-map-name'

describe('personalMapName', () => {
  it('builds an English map name from the user name', () => {
    expect(personalMapName('Romain')).toBe("Romain's map")
    expect(personalMapName(' James ')).toBe("James' map")
  })

  it('keeps a fallback when no user is signed in', () => {
    expect(personalMapName(undefined)).toBe('Personal map')
  })
})
