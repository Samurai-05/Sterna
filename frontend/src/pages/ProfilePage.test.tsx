import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Discovery } from '@/lib/mock-data'
import {
  deleteAccount,
  getAuthoredDiscoveries,
  getAuthoredPois,
  getCurrentUser,
} from '@/lib/api'
import { loadSession, saveSession } from '@/lib/session'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ProfilePage } from './ProfilePage'

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status = 0
  },
  deleteAccount: vi.fn(),
  getAuthoredDiscoveries: vi.fn(),
  getAuthoredPois: vi.fn(),
  getCurrentUser: vi.fn(),
}))

const deleteAccountMock = vi.mocked(deleteAccount)
const getAuthoredDiscoveriesMock = vi.mocked(getAuthoredDiscoveries)
const getAuthoredPoisMock = vi.mocked(getAuthoredPois)
const getCurrentUserMock = vi.mocked(getCurrentUser)

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
    getAuthoredPoisMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('shows unique human-readable countries from discovery country codes', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([
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

  it('deletes the account and clears the session on confirmation', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([])
    deleteAccountMock.mockResolvedValue(undefined)

    renderWithProviders(<ProfilePage />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open account settings' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct horse battery staple' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))

    await waitFor(() => {
      expect(deleteAccountMock).toHaveBeenCalledWith(
        'test-token',
        'correct horse battery staple',
      )
    })
    expect(loadSession()).toBeNull()
  })

  it('shows the server error and keeps the session on a failed deletion', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([])
    deleteAccountMock.mockRejectedValue(
      new Error('The current password is incorrect.'),
    )

    renderWithProviders(<ProfilePage />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open account settings' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))

    await screen.findByText('The current password is incorrect.')
    expect(loadSession()).not.toBeNull()
  })
})
