import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { getPhoto, getDiscoveries } from '@/lib/api'
import { loadSession, saveSession } from '@/lib/session'
import { renderWithProviders } from './test/renderWithProviders'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

function signIn() {
  saveSession({
    accessToken: 'expired-token',
    user: {
      id: '1',
      email: 'explorer@sterna.app',
      userName: 'Explorer',
      avatarObjectKey: null,
      createdAt: '2026-08-26T08:00:00.000Z',
    },
  })
}

function respondWith(status: number, body: unknown) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('a session the API rejects', () => {
  it('is discarded whichever screen makes the call', async () => {
    signIn()
    respondWith(401, { message: 'Unauthorized' })

    await expect(getDiscoveries('expired-token')).rejects.toThrow()

    expect(loadSession()).toBeNull()
  })

  it('is discarded on a photo request too, not only on JSON routes', async () => {
    signIn()
    respondWith(401, { message: 'Unauthorized' })

    await expect(getPhoto('expired-token', 'a-key')).rejects.toThrow()

    expect(loadSession()).toBeNull()
  })

  it('leaves a failed login alone, since that 401 is not an expiry', async () => {
    signIn()
    respondWith(401, { message: 'Invalid credentials.' })

    window.localStorage.removeItem('sterna.auth')
    const { login } = await import('@/lib/api')
    await expect(
      login({ email: 'someone@sterna.app', password: 'wrong' }),
    ).rejects.toThrow()

    expect(loadSession()).toBeNull()
  })

  it('sends the user back to the welcome screen instead of an empty shell', async () => {
    signIn()
    respondWith(401, { message: 'Unauthorized' })

    renderWithProviders(<App />, { route: '/collection' })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
    })
  })
})
