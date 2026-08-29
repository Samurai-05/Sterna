import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router'

import { renderWithProviders } from '@/test/renderWithProviders'
import { clearSession, saveSession } from '@/lib/session'
import { loadRecentSearches, saveRecentSearch } from '@/lib/recent-searches'
import * as api from '@/lib/api'
import { SearchPage } from './SearchPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getActiveMap: vi.fn(),
    getDiscoveries: vi.fn(),
    getPois: vi.fn(),
    searchLocations: vi.fn(),
  }
})

afterEach(() => {
  clearSession()
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('SearchPage', () => {
  it('guides the map to a discovery selected by title', async () => {
    prepareSessionAndQueries()
    vi.mocked(api.getDiscoveries).mockResolvedValue([
      {
        id: 9,
        userId: '1',
        name: 'Hidden waterfall',
        category: 'landscape',
        location: '46.5000, 6.6000',
        imageId: 'waterfall',
        description: '',
        author: 'Explorer',
        initials: 'E',
        relativeDate: 'today',
        coordinates: [6.6, 46.5],
        countryCode: 'CHE',
      },
    ])

    renderSearch()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search a place' }), {
      target: { value: 'waterfall' },
    })
    fireEvent.click(await screen.findByText('Hidden waterfall'))

    expect(await screen.findByTestId('map-target')).toHaveTextContent(
      '6.6,46.5|16|Hidden waterfall',
    )
    expect(loadRecentSearches('1')[0].label).toBe('Hidden waterfall')
  })

  it('guides the map to an online country or place result', async () => {
    prepareSessionAndQueries()
    vi.mocked(api.searchLocations).mockResolvedValue([
      {
        id: 'relation:51701',
        label: 'Switzerland',
        type: 'country',
        longitude: 8.23,
        latitude: 46.8,
        zoom: 5,
      },
    ])

    renderSearch()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search a place' }), {
      target: { value: 'Switzerland' },
    })
    fireEvent.click(
      await screen.findByText('Switzerland', {}, { timeout: 2000 }),
    )

    expect(await screen.findByTestId('map-target')).toHaveTextContent(
      '8.23,46.8|5|Switzerland',
    )
  })

  it('shows persisted recent searches below the input', async () => {
    prepareSessionAndQueries()
    saveRecentSearch('1', {
      id: 'place:bern',
      kind: 'place',
      label: 'Bern, Switzerland',
      detail: 'City',
      coordinates: [7.4474, 46.948],
      zoom: 12,
    })

    renderSearch()

    expect(await screen.findByText('Recent searches')).toBeInTheDocument()
    expect(screen.getByText('Bern, Switzerland')).toBeInTheDocument()
  })

  it('suggests nearby POIs and previous discoveries by distance', async () => {
    prepareSessionAndQueries()
    vi.mocked(api.getPois).mockResolvedValue([
      {
        id: 'poi-1',
        name: 'Nearby museum',
        city: 'Paris',
        country: 'France',
        imageId: 'museum',
        description: 'A local museum',
        discovered: false,
        coordinates: [2.353, 48.857],
      },
    ])
    vi.mocked(api.getDiscoveries).mockResolvedValue([
      {
        id: 10,
        userId: '1',
        name: 'Old discovery',
        category: 'culture',
        location: 'Paris, France',
        imageId: 'old-discovery',
        description: '',
        author: 'Explorer',
        initials: 'E',
        relativeDate: 'last year',
        coordinates: [2.36, 48.86],
        countryCode: 'FRA',
      },
    ])

    renderSearch()

    expect(await screen.findByText('Explore nearby')).toBeInTheDocument()
    expect(await screen.findByText('Nearby museum')).toBeInTheDocument()
    expect(screen.getByText('Old discovery')).toBeInTheDocument()
    expect(screen.getAllByText(/away/)).toHaveLength(2)
  })
})

function prepareSessionAndQueries() {
  saveSession({
    accessToken: 'token',
    user: {
      id: '1',
      email: 'explorer@sterna.app',
      userName: 'Explorer',
      createdAt: '2026-08-28T10:00:00.000Z',
    },
  })
  vi.mocked(api.getActiveMap).mockResolvedValue({ groupId: null, name: null })
  vi.mocked(api.getDiscoveries).mockResolvedValue([])
  vi.mocked(api.getPois).mockResolvedValue([])
  vi.mocked(api.searchLocations).mockResolvedValue([])
}

function renderSearch() {
  return renderWithProviders(
    <Routes>
      <Route path="/search" element={<SearchPage />} />
      <Route path="/" element={<MapTargetProbe />} />
    </Routes>,
    { route: '/search' },
  )
}

function MapTargetProbe() {
  const location = useLocation()
  const target = (
    location.state as {
      mapTarget?: {
        coordinates: [number, number]
        zoom: number
        label: string
      }
    } | null
  )?.mapTarget

  return (
    <div data-testid="map-target">
      {target
        ? `${target.coordinates.join(',')}|${target.zoom}|${target.label}`
        : 'none'}
    </div>
  )
}
