import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')

  return {
    ...actual,
    getDiscoveries: vi.fn(),
    getAllGroupDiscoveries: vi.fn(),
    getGroups: vi.fn(),
    getPois: vi.fn(),
  }
})

const api = vi.mocked(await import('@/lib/api'))
const { CollectionPage } = await import('./CollectionPage')
const { renderWithProviders } = await import('@/test/renderWithProviders')

beforeEach(() => {
  window.localStorage.setItem(
    'sterna.auth',
    JSON.stringify({
      accessToken: 'test-token',
      user: { id: '1', email: 'emma@example.com', userName: 'Emma' },
    }),
  )
  api.getDiscoveries.mockResolvedValue([])
  api.getAllGroupDiscoveries.mockResolvedValue([])
  api.getGroups.mockResolvedValue([])
  api.getPois.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe('collection page', () => {
  it('names the screen for assistive technology', async () => {
    renderWithProviders(<CollectionPage />, { route: '/collection' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Collection' }),
    ).toBeInTheDocument()
  })

  it('tells a new explorer what to do instead of showing blank space', async () => {
    renderWithProviders(<CollectionPage />, { route: '/collection' })

    expect(await screen.findByText('No discoveries yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a discovery' })).toHaveAttribute(
      'href',
      '/add',
    )
  })
})
