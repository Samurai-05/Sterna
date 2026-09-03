import { describe, expect, it } from 'vitest'

import { getApiProxyConfig } from './vite.config'

describe('Vite API proxy configuration', () => {
  it('uses the local backend for normal development', () => {
    expect(getApiProxyConfig('development')).toEqual({
      target: 'http://localhost:3000',
    })
  })

  it('uses the remote backend with the correct Host header in remote mode', () => {
    expect(getApiProxyConfig('remote')).toEqual({
      target: 'https://labo-iot1.iict-heig-vd.ch',
      changeOrigin: true,
    })
  })
})
