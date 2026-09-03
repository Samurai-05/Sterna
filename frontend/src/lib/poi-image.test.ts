import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadGetPoiImageUrl(apiBaseUrl = '') {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', apiBaseUrl)
  return (await import('./poi-image')).getPoiImageUrl
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('getPoiImageUrl', () => {
  const source =
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Example.jpg?width=1600'

  it.each([
    ['map', 192],
    ['thumbnail', 128],
    ['card', 640],
    ['detail', 1200],
  ] as const)('requests the %s width for POI images', (size, width) => {
    return loadGetPoiImageUrl().then((getPoiImageUrl) => {
      expect(getPoiImageUrl(source, 'fallback', size)).toBe(
        `https://commons.wikimedia.org/wiki/Special:Redirect/file/Example.jpg?width=${width}`,
      )
    })
  })

  it('uses a sized fallback when a POI has no catalog image', async () => {
    const getPoiImageUrl = await loadGetPoiImageUrl()
    expect(getPoiImageUrl(undefined, 'fallback', 'card')).toContain('w=640')
  })

  it('resolves the same-origin proxy path the API now returns on the web', async () => {
    const getPoiImageUrl = await loadGetPoiImageUrl()
    const url = getPoiImageUrl('/api/pois/42/image', 'fallback', 'card')
    expect(url).toBe(`${window.location.origin}/api/pois/42/image?width=640`)
  })

  it('resolves the proxy path through the configured Android API base URL', async () => {
    const getPoiImageUrl = await loadGetPoiImageUrl(
      'https://labo-iot1.iict-heig-vd.ch',
    )

    expect(getPoiImageUrl('/api/pois/42/image', 'fallback', 'card')).toBe(
      'https://labo-iot1.iict-heig-vd.ch/api/pois/42/image?width=640',
    )
  })
})
