import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Discovery } from '@/lib/mock-data'
import {
  deleteAccount,
  getAuthoredDiscoveries,
  getAuthoredPois,
  getCurrentUser,
  getPhoto,
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
  getPhoto: vi.fn(),
}))

const deleteAccountMock = vi.mocked(deleteAccount)
const getAuthoredDiscoveriesMock = vi.mocked(getAuthoredDiscoveries)
const getAuthoredPoisMock = vi.mocked(getAuthoredPois)
const getCurrentUserMock = vi.mocked(getCurrentUser)
const getPhotoMock = vi.mocked(getPhoto)

function makeDiscovery(
  id: number,
  countryCode: string,
  location: string,
  createdAt?: string,
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
    ...(createdAt ? { createdAt } : {}),
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
        avatarObjectKey: null,
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    getCurrentUserMock.mockResolvedValue({
      id: '1',
      email: 'explorer@sterna.app',
      userName: 'Explorer',
      avatarObjectKey: null,
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

  it('shows the account photo instead of the initial once it loads', async () => {
    getCurrentUserMock.mockResolvedValue({
      id: '1',
      email: 'explorer@sterna.app',
      userName: 'Explorer',
      avatarObjectKey: 'photos/avatar.jpg',
      createdAt: '2026-08-26T08:00:00.000Z',
    })
    getAuthoredDiscoveriesMock.mockResolvedValue([])
    getPhotoMock.mockResolvedValue(new Blob(['fake image bytes']))

    const { container } = renderWithProviders(<ProfilePage />)

    await waitFor(() =>
      expect(getPhotoMock).toHaveBeenCalledWith(
        'test-token',
        'photos/avatar.jpg',
      ),
    )
    await waitFor(() =>
      expect(container.querySelectorAll('img').length).toBeGreaterThan(0),
    )
  })

  it('offers an edit-profile entry point from the account sheet', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([])

    renderWithProviders(<ProfilePage />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open account settings' }),
    )

    expect(screen.getByRole('link', { name: /Edit profile/ })).toHaveAttribute(
      'href',
      '/profile/edit',
    )
  })

  it('presents the exploration story in the intended mobile-first order', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([
      makeDiscovery(1, 'FRA', 'Paris, France', '2026-09-01T00:00:00.000Z'),
    ])
    getAuthoredPoisMock.mockResolvedValue([
      {
        id: 'eiffel-tower',
        name: 'Eiffel Tower',
        city: 'Paris',
        country: 'France',
        imageId: 'photo-eiffel',
        description: '',
        discovered: true,
        coordinates: [2.2945, 48.8584],
      },
    ])

    renderWithProviders(<ProfilePage />)

    const profilePage = screen
      .getByRole('region', { name: 'Profile overview' })
      .closest('main')!
    await screen.findByRole('group', { name: 'Discoveries: 1' })
    const headings = within(profilePage)
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)

    expect(headings).toEqual([
      'Explorer',
      'Your exploration',
      'Recent discoveries',
      'Points of interest',
      'Discoveries by category',
      'Exploration over time',
      'Countries explored',
    ])
    expect(
      within(profilePage).getByRole('group', { name: 'Countries: 1' }),
    ).toBeInTheDocument()
    expect(
      within(profilePage).getByRole('group', { name: 'POIs: 1' }),
    ).toBeInTheDocument()
  })

  it('keeps section-level recovery messages when profile queries fail', async () => {
    getAuthoredDiscoveriesMock.mockRejectedValue(new Error('offline'))
    getAuthoredPoisMock.mockRejectedValue(new Error('offline'))

    renderWithProviders(<ProfilePage />)

    expect(
      await screen.findByText('Exploration data is temporarily unavailable.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Recent discoveries are temporarily unavailable.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Point of interest progress is temporarily unavailable.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Country data is temporarily unavailable.'),
    ).toBeInTheDocument()
  })
})
