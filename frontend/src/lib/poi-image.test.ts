import { describe, expect, it } from 'vitest'

import { getPoiImageUrl } from './poi-image'

describe('getPoiImageUrl', () => {
  const source =
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Example.jpg?width=1600'

  it.each([
    ['map', 192],
    ['card', 640],
    ['detail', 1200],
  ] as const)('requests the %s width for POI images', (size, width) => {
    expect(getPoiImageUrl(source, 'fallback', size)).toBe(
      `https://commons.wikimedia.org/wiki/Special:Redirect/file/Example.jpg?width=${width}`,
    )
  })

  it('uses a sized fallback when a POI has no catalog image', () => {
    expect(getPoiImageUrl(undefined, 'fallback', 'card')).toContain('w=640')
  })
})
