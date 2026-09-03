import { afterEach, describe, expect, it, vi } from 'vitest'

import { discoveries } from '@/lib/mock-data'
import {
  readCachedDiscoveries,
  readCachedPois,
  writeCachedDiscoveries,
  writeCachedPois,
} from './profile-cache'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('profile cache', () => {
  it('ignores malformed or incompatible entries', () => {
    window.localStorage.setItem(
      'sterna:profile:v1:user-a:discoveries',
      '{not valid json',
    )
    expect(readCachedDiscoveries('user-a')).toBeNull()

    window.localStorage.setItem(
      'sterna:profile:v1:user-a:pois',
      JSON.stringify({ version: 2, data: [] }),
    )
    expect(readCachedPois('user-a')).toBeNull()
  })

  it('does not throw when storage reads or writes fail', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => readCachedDiscoveries('user-a')).not.toThrow()
    expect(() =>
      writeCachedDiscoveries('user-a', [discoveries[0]]),
    ).not.toThrow()
    expect(() => writeCachedPois('user-a', [])).not.toThrow()
  })

  it('keeps entries isolated by user id', () => {
    writeCachedDiscoveries('user-a', [discoveries[0]])

    expect(readCachedDiscoveries('user-a')).toEqual([discoveries[0]])
    expect(readCachedDiscoveries('user-b')).toBeNull()
  })
})
