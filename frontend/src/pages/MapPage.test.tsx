import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Discovery } from '@/lib/mock-data'
import { saveSession, clearSession } from '@/lib/session'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MapPage } from './MapPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getActiveMap: vi.fn(),
    getDiscoveries: vi.fn(),
    getGroupDiscoveries: vi.fn(),
    getGroups: vi.fn(),
    getPois: vi.fn(),
    setActiveMap: vi.fn(),
  }
})

vi.mock('@/components/MapCanvas', async () => {
  const React = await import('react')

  return {
    MapCanvas: React.forwardRef(function MapCanvasMock({
      discoveries,
      exploredCountryCodes,
    }: {
      discoveries?: Discovery[]
      exploredCountryCodes?: string[]
    }) {
      return (
        <div aria-label="Interactive map">
          {discoveries?.map((discovery) => (
            <span key={discovery.id}>{discovery.name}</span>
          ))}
          <span data-testid="explored-countries">
            {exploredCountryCodes?.join(',')}
          </span>
        </div>
      )
    }),
  }
})

const api = vi.mocked(await import('@/lib/api'))

const personalDiscovery: Discovery = {
  id: 1,
  name: 'Personal find',
  category: 'landscape',
  location: 'Paris',
  imageId: 'personal',
  description: '',
  author: 'Explorer',
  initials: 'E',
  relativeDate: 'today',
  coordinates: [2.3, 48.8],
  countryCode: 'FRA',
}

const groupDiscovery: Discovery = {
  ...personalDiscovery,
  id: 2,
  name: 'Group find',
  countryCode: 'CHE',
}

beforeEach(() => {
  saveSession({
    accessToken: 'test-token',
    user: {
      id: '1',
      email: 'explorer@sterna.app',
      userName: 'Explorer',
      createdAt: '2026-08-26T08:00:00.000Z',
    },
  })
  api.getActiveMap.mockResolvedValue({ groupId: null, name: null })
  api.getDiscoveries.mockResolvedValue([personalDiscovery])
  api.getGroupDiscoveries.mockResolvedValue([groupDiscovery])
  api.getGroups.mockResolvedValue([
    {
      id: '12',
      name: 'Swiss weekend',
      description: null,
      role: 'member',
      isActive: false,
      memberCount: 2,
      discoveryCount: 1,
    },
  ])
  api.getPois.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
  clearSession()
})

describe('MapPage active map switching', () => {
  it('opens the map picker and switches from personal to a group without navigating', async () => {
    api.setActiveMap.mockResolvedValue({ groupId: '12', name: 'Swiss weekend' })

    renderWithProviders(<MapPage active />)

    fireEvent.click(await screen.findByRole('button', { name: /Personal map/ }))
    expect(
      screen.getByRole('dialog', { name: 'Choose a map' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Swiss weekend/ }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Swiss weekend/ }))

    await waitFor(() =>
      expect(api.setActiveMap).toHaveBeenCalledWith({
        accessToken: 'test-token',
        groupId: '12',
      }),
    )
    expect(await screen.findByText('Swiss weekend')).toBeInTheDocument()
    expect(await screen.findByText('Group find')).toBeInTheDocument()
    expect(screen.getByTestId('explored-countries')).toHaveTextContent('CHE')
    await waitFor(() => expect(api.getPois).toHaveBeenCalledTimes(2))
    expect(
      screen.queryByRole('dialog', { name: 'Choose a map' }),
    ).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('keeps the picker open and reports a non-blocking error when switching fails', async () => {
    api.setActiveMap.mockRejectedValue(new Error('Network unavailable'))

    renderWithProviders(<MapPage active />)

    fireEvent.click(await screen.findByRole('button', { name: /Personal map/ }))
    fireEvent.click(screen.getByRole('button', { name: /Swiss weekend/ }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to change the active map.',
    )
    const dialog = screen.getByRole('dialog', { name: 'Choose a map' })
    expect(
      within(dialog).getByRole('button', { name: /Personal map/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Group find')).not.toBeInTheDocument()
  })
})
