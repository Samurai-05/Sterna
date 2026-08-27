import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Discovery } from '@/lib/mock-data'
import {
  getActiveMap,
  getCurrentUser,
  getDiscoveries,
  getGroupDiscoveries,
  getPois,
} from '@/lib/api'
import { saveSession } from '@/lib/session'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ProfilePage } from './ProfilePage'

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status = 0
  },
  getCurrentUser: vi.fn(),
  getDiscoveries: vi.fn(),
  getActiveMap: vi.fn(),
  getGroupDiscoveries: vi.fn(),
  getPois: vi.fn(),
}))

const getActiveMapMock = vi.mocked(getActiveMap)
const getCurrentUserMock = vi.mocked(getCurrentUser)
const getDiscoveriesMock = vi.mocked(getDiscoveries)
const getGroupDiscoveriesMock = vi.mocked(getGroupDiscoveries)
const getPoisMock = vi.mocked(getPois)

function makeDiscovery(
  id: number,
  countryCode: string,
  location: string,
): Discovery {
  return {
    id,
    name: `Discovery ${id}`,
    category: 'landscape',
    location,
    imageId: `photo-${id}`,
    description: '',
    author: 'Explorer',
    initials: 'E',
    relativeDate: 'today',
    coordinates: [0, 0],
    countryCode,
  }
}

describe('ProfilePage', () => {
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
    getCurrentUserMock.mockResolvedValue({
      id: '1',
      email: 'explorer@sterna.app',
      userName: 'Explorer',
      createdAt: '2026-08-26T08:00:00.000Z',
    })
    getActiveMapMock.mockResolvedValue({ groupId: null, name: null })
    getGroupDiscoveriesMock.mockResolvedValue([])
    getPoisMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('shows unique human-readable countries from discovery country codes', async () => {
    getDiscoveriesMock.mockResolvedValue([
      makeDiscovery(1, 'FRA', '48.8566, 2.3522'),
      makeDiscovery(2, 'FRA', '48.8606, 2.3364'),
      makeDiscovery(3, 'CHE', '46.9480, 7.4474'),
      makeDiscovery(4, 'UNK', '0.0000, 8.3522'),
    ])

    renderWithProviders(<ProfilePage />)

    const countriesSection = within(
      screen.getByRole('region', { name: 'Countries explored' }),
    )

    await countriesSection.findByText('Switzerland')
    expect(countriesSection.getAllByText('France')).toHaveLength(1)
    expect(countriesSection.getByText('Switzerland')).toBeInTheDocument()
    expect(countriesSection.queryByText('2.3522')).not.toBeInTheDocument()
    expect(countriesSection.queryByText('8.3522')).not.toBeInTheDocument()
    expect(countriesSection.queryByText('UNK')).not.toBeInTheDocument()
  })

  it('uses the active group map for exploration statistics', async () => {
    getActiveMapMock.mockResolvedValue({ groupId: '12', name: 'Swiss weekend' })
    getGroupDiscoveriesMock.mockResolvedValue([
      makeDiscovery(8, 'CHE', '46.9480, 7.4474'),
    ])
    getPoisMock.mockResolvedValue([])

    renderWithProviders(<ProfilePage />)

    await screen.findByText('Swiss weekend')
    await screen.findByText('Discovery 8')
    const overview = screen.getByRole('region', {
      name: 'Profile overview',
    })
    expect(within(overview).getAllByText('1')).toHaveLength(2)
    expect(
      screen.getByRole('region', { name: 'Countries explored' }),
    ).toHaveTextContent('Switzerland')
    expect(screen.getByText('Swiss weekend')).toBeInTheDocument()
    expect(getDiscoveriesMock).not.toHaveBeenCalled()
    expect(getGroupDiscoveriesMock).toHaveBeenCalledWith('test-token', '12')
  })
})
