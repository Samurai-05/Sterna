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
  options: {
    category?: Discovery['category']
    createdAt?: string
    discoveredAt?: string
    groupIds?: string[]
  } = {},
): Discovery {
  return {
    id,
    name: `Discovery ${id}`,
    category: options.category ?? 'landscape',
    location,
    imageId: `photo-${id}`,
    description: '',
    author: 'Explorer',
    initials: 'E',
    relativeDate: 'today',
    createdAt: options.createdAt,
    discoveredAt: options.discoveredAt,
    groupIds: options.groupIds,
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

  it('shows authored exploration statistics and counts shared discoveries once', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([
      makeDiscovery(1, 'FRA', 'Paris', { groupIds: ['friends', 'family'] }),
      makeDiscovery(2, 'FRA', 'Lyon'),
      makeDiscovery(3, 'CHE', 'Bern'),
      makeDiscovery(4, 'UNK', 'Unknown country'),
    ])

    renderWithProviders(<ProfilePage />)

    expect(
      await screen.findByRole('group', { name: 'Discoveries: 4' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Countries: 2' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'POIs: 0' })).toBeInTheDocument()
    expect(
      screen
        .getByRole('group', { name: 'Discoveries: 4' })
        .closest('[role="list"]'),
    ).toBeNull()
    expect(screen.queryByText('Countries explored')).not.toBeInTheDocument()
  })

  it('keeps settings explicit without competing with the identity on narrow screens', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([])

    renderWithProviders(<ProfilePage />)

    const settingsButton = await screen.findByRole('button', {
      name: 'Open account settings',
    })

    expect(settingsButton).toHaveClass('absolute')
    expect(settingsButton).toHaveAttribute('title', 'Settings')
    expect(
      screen.queryByText('Settings', { selector: 'span' }),
    ).not.toBeInTheDocument()
  })

  it('shows POI progress and orders recent discoveries by discovery date', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([
      makeDiscovery(1, 'FRA', 'Paris', {
        createdAt: '2026-08-31T00:00:00.000Z',
        discoveredAt: '2024-01-01T00:00:00.000Z',
      }),
      makeDiscovery(2, 'CHE', 'Bern', {
        createdAt: '2024-01-01T00:00:00.000Z',
        discoveredAt: '2026-08-31T00:00:00.000Z',
      }),
    ])
    getAuthoredPoisMock.mockResolvedValue([
      {
        id: 'poi-1',
        name: 'POI 1',
        city: 'Paris',
        country: 'France',
        imageId: 'poi-1',
        description: '',
        discovered: true,
        coordinates: [0, 0],
      },
      {
        id: 'poi-2',
        name: 'POI 2',
        city: 'Bern',
        country: 'Switzerland',
        imageId: 'poi-2',
        description: '',
        discovered: false,
        coordinates: [0, 0],
      },
    ])

    renderWithProviders(<ProfilePage />)

    const progress = await screen.findByRole('progressbar', {
      name: 'Point of interest exploration progress',
    })
    expect(progress).toHaveAttribute(
      'aria-valuetext',
      '1 of 2 points of interest discovered',
    )

    const recentSection = screen.getByRole('region', {
      name: 'Recent discoveries',
    })
    const recentLinks = within(recentSection).getAllByRole('link').slice(1)
    expect(recentLinks[0]).toHaveAccessibleName(/Discovery 2/)
    expect(recentLinks[1]).toHaveAccessibleName(/Discovery 1/)
    expect(recentLinks[0]).toHaveAttribute('href', '/discoveries/2')
    expect(
      screen.queryByRole('heading', { name: 'Discovery activity' }),
    ).not.toBeInTheDocument()
  })

  it('does not show the empty state while authored discoveries are loading', async () => {
    let resolveDiscoveries!: (value: Discovery[]) => void
    getAuthoredDiscoveriesMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDiscoveries = resolve
      }),
    )

    renderWithProviders(<ProfilePage />)

    expect(
      screen.queryByText('Your world starts here.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Add discovery' }),
    ).not.toBeInTheDocument()

    resolveDiscoveries([])
    expect(
      await screen.findByText('Your world starts here.'),
    ).toBeInTheDocument()
  })

  it('renders category rows with uncategorized discoveries and total-based ratios', async () => {
    const uncategorizedDiscovery = makeDiscovery(3, 'ITA', 'Rome') as Discovery
    uncategorizedDiscovery.category = null
    getAuthoredDiscoveriesMock.mockResolvedValue([
      makeDiscovery(1, 'FRA', 'Paris'),
      makeDiscovery(2, 'CHE', 'Bern'),
      uncategorizedDiscovery,
    ])

    renderWithProviders(<ProfilePage />)

    const categoryList = await screen.findByRole('list', {
      name: 'Discovery distribution by category',
    })
    expect(
      within(categoryList).getByRole('listitem', {
        name: 'Landscape: 2 discoveries',
      }),
    ).toBeInTheDocument()
    expect(
      within(categoryList).getByRole('listitem', {
        name: 'Uncategorized: 1 discovery',
      }),
    ).toBeInTheDocument()
    expect(
      within(categoryList).getByTestId('category-bar-landscape'),
    ).toHaveStyle({ width: '66.66666666666666%' })
    expect(
      within(categoryList).getByTestId('category-bar-landscape'),
    ).toHaveStyle({ backgroundColor: '#2F6B8A' })
    expect(
      within(categoryList).getByTestId('category-bar-uncategorized'),
    ).toHaveStyle({ width: '33.33333333333333%' })
  })

  it('shows an intentional starting state when there are no authored discoveries', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([])

    renderWithProviders(<ProfilePage />)

    expect(
      await screen.findByText('Your world starts here.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Save your first discovery and start revealing the places you've explored.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add discovery' })).toHaveAttribute(
      'href',
      '/add',
    )
    expect(
      screen.queryByRole('region', { name: 'Recent discoveries' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('list', {
        name: 'Discovery distribution by category',
      }),
    ).not.toBeInTheDocument()
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
})
