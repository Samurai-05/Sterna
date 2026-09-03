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

function writeProfileCache<T>(
  userId: string,
  resource: 'discoveries' | 'pois',
  data: T,
) {
  window.localStorage.setItem(
    `sterna:profile:v1:${userId}:${resource}`,
    JSON.stringify({ version: 1, data }),
  )
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

  it('shows unique country flags with names available on interaction', async () => {
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

    const switzerlandFlag = await countriesSection.findByRole('button', {
      name: 'Switzerland',
    })
    expect(
      countriesSection.getAllByRole('button', { name: 'France' }),
    ).toHaveLength(1)
    expect(
      within(switzerlandFlag).getByTestId('country-flag-CHE'),
    ).toHaveAttribute('src', '/country-flags/ch.svg')
    expect(switzerlandFlag).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(switzerlandFlag)
    expect(switzerlandFlag).toHaveAttribute('aria-expanded', 'true')
    const tooltip = within(switzerlandFlag).getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Switzerland')
    expect(tooltip).toHaveClass('opacity-100')
    expect(countriesSection.queryByText('2.3522')).not.toBeInTheDocument()
    expect(countriesSection.queryByText('8.3522')).not.toBeInTheDocument()
    expect(countriesSection.queryByText('UNK')).not.toBeInTheDocument()
  })

  it('renders cached profile data while the backend refresh is pending', () => {
    const cachedDiscovery = makeDiscovery(1, 'FRA', 'Paris, France')
    const cachedPoi = {
      id: 'eiffel-tower',
      name: 'Eiffel Tower',
      city: 'Paris',
      country: 'France',
      imageId: 'photo-eiffel',
      description: '',
      discovered: true,
      coordinates: [2.2945, 48.8584] as [number, number],
    }
    writeProfileCache('1', 'discoveries', [cachedDiscovery])
    writeProfileCache('1', 'pois', [cachedPoi])
    getAuthoredDiscoveriesMock.mockReturnValue(new Promise(() => {}))
    getAuthoredPoisMock.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ProfilePage />)

    expect(
      screen.getByRole('group', { name: 'Discoveries: 1' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'POIs: 1' })).toBeInTheDocument()
    expect(
      screen.getByRole('listitem', { name: 'Landscape: 1 discovery' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('France').length).toBeGreaterThan(0)
    expect(
      screen.queryByText('Exploration data is temporarily unavailable.'),
    ).not.toBeInTheDocument()
  })

  it('replaces cached profile data and updates the cache after a successful refresh', async () => {
    const cachedDiscovery = makeDiscovery(1, 'FRA', 'Paris, France')
    const freshDiscoveries = [
      makeDiscovery(2, 'CHE', 'Bern, Switzerland'),
      makeDiscovery(3, 'CHE', 'Zurich, Switzerland'),
    ]
    const cachedPoi = {
      id: 'eiffel-tower',
      name: 'Eiffel Tower',
      city: 'Paris',
      country: 'France',
      imageId: 'photo-eiffel',
      description: '',
      discovered: true,
      coordinates: [2.2945, 48.8584] as [number, number],
    }
    const freshPois = [
      { ...cachedPoi, id: 'jet-d-eau', name: 'Jet d’eau', discovered: false },
    ]
    writeProfileCache('1', 'discoveries', [cachedDiscovery])
    writeProfileCache('1', 'pois', [cachedPoi])
    getAuthoredDiscoveriesMock.mockResolvedValue(freshDiscoveries)
    getAuthoredPoisMock.mockResolvedValue(freshPois)

    renderWithProviders(<ProfilePage />)

    await screen.findByRole('group', { name: 'Discoveries: 2' })
    expect(screen.getAllByText('Switzerland').length).toBeGreaterThan(0)
    expect(screen.queryByText('France')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'POIs: 0' })).toBeInTheDocument()
    expect(
      JSON.parse(
        window.localStorage.getItem('sterna:profile:v1:1:discoveries')!,
      ),
    ).toEqual({ version: 1, data: freshDiscoveries })
    expect(
      JSON.parse(window.localStorage.getItem('sterna:profile:v1:1:pois')!),
    ).toEqual({ version: 1, data: freshPois })
  })

  it('keeps cached profile data visible when the background refresh fails', async () => {
    const cachedDiscovery = makeDiscovery(1, 'FRA', 'Paris, France')
    const cachedPoi = {
      id: 'eiffel-tower',
      name: 'Eiffel Tower',
      city: 'Paris',
      country: 'France',
      imageId: 'photo-eiffel',
      description: '',
      discovered: true,
      coordinates: [2.2945, 48.8584] as [number, number],
    }
    writeProfileCache('1', 'discoveries', [cachedDiscovery])
    writeProfileCache('1', 'pois', [cachedPoi])
    getAuthoredDiscoveriesMock.mockRejectedValue(new Error('offline'))
    getAuthoredPoisMock.mockRejectedValue(new Error('offline'))

    renderWithProviders(<ProfilePage />)

    await waitFor(() => {
      expect(getAuthoredDiscoveriesMock).toHaveBeenCalledWith('test-token')
      expect(getAuthoredPoisMock).toHaveBeenCalledWith('test-token')
    })
    expect(
      screen.getByRole('group', { name: 'Discoveries: 1' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'POIs: 1' })).toBeInTheDocument()
    expect(
      screen.queryByText('Exploration data is temporarily unavailable.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'Point of interest progress is temporarily unavailable.',
      ),
    ).not.toBeInTheDocument()
  })

  it('ignores corrupt cached profile data and falls back to the backend', async () => {
    window.localStorage.setItem(
      'sterna:profile:v1:1:discoveries',
      '{not valid json',
    )
    getAuthoredDiscoveriesMock.mockResolvedValue([
      makeDiscovery(1, 'CHE', 'Bern, Switzerland'),
    ])

    renderWithProviders(<ProfilePage />)

    expect(
      await screen.findByRole('group', { name: 'Discoveries: 1' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Switzerland').length).toBeGreaterThan(0)
  })

  it('never uses profile cache data belonging to another user', () => {
    writeProfileCache('1', 'discoveries', [
      makeDiscovery(1, 'FRA', 'Paris, France'),
    ])
    saveSession({
      accessToken: 'other-token',
      user: {
        id: '2',
        email: 'other@sterna.app',
        userName: 'Other explorer',
        avatarObjectKey: null,
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
    getAuthoredDiscoveriesMock.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ProfilePage />)

    expect(
      screen.getByRole('status', { name: 'Loading exploration map' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('France')).not.toBeInTheDocument()
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

  it('clears only the current user profile cache when logging out', async () => {
    writeProfileCache('1', 'discoveries', [
      makeDiscovery(1, 'FRA', 'Paris, France'),
    ])
    writeProfileCache('1', 'pois', [])
    writeProfileCache('2', 'discoveries', [
      makeDiscovery(2, 'CHE', 'Bern, Switzerland'),
    ])
    getAuthoredDiscoveriesMock.mockResolvedValue([])

    renderWithProviders(<ProfilePage />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open account settings' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(
      window.localStorage.getItem('sterna:profile:v1:1:discoveries'),
    ).toBeNull()
    expect(window.localStorage.getItem('sterna:profile:v1:1:pois')).toBeNull()
    expect(
      window.localStorage.getItem('sterna:profile:v1:2:discoveries'),
    ).not.toBeNull()
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
      'Countries explored',
      'POIs visited',
      'Discoveries by category',
      'Exploration over time',
      'Recent discoveries',
    ])
    expect(
      within(profilePage).getByRole('group', {
        name: 'Countries: 1 of 221',
      }),
    ).toBeInTheDocument()
    expect(
      within(profilePage).getByRole('group', { name: 'POIs: 1 of 1' }),
    ).toBeInTheDocument()

    const visitedPois = within(
      screen.getByRole('region', { name: 'POIs visited' }),
    )
    const poiThumbnail = visitedPois.getByRole('button', {
      name: 'Eiffel Tower',
    })
    expect(poiThumbnail.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('w=128'),
    )
    expect(poiThumbnail).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(poiThumbnail)
    expect(poiThumbnail).toHaveAttribute('aria-expanded', 'true')
    expect(within(poiThumbnail).getByRole('tooltip')).toHaveTextContent(
      'Eiffel Tower',
    )
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
      screen.getByText('Visited POIs are temporarily unavailable.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Exploration activity is temporarily unavailable.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Country data is temporarily unavailable.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No discoveries recorded in the last 6 months.'),
    ).not.toBeInTheDocument()
  })

  it('does not render false empty states while discoveries are loading', async () => {
    getAuthoredDiscoveriesMock.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ProfilePage />)

    expect(
      screen.getByRole('status', { name: 'Loading exploration map' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Loading explored countries…')).toBeInTheDocument()
    expect(
      screen.getByText('Loading exploration over time…'),
    ).toBeInTheDocument()
    expect(screen.getByText('Loading recent discoveries…')).toBeInTheDocument()

    expect(
      screen.queryByText('No countries explored yet.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('No discoveries recorded in the last 6 months.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('No recent discoveries yet.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'World exploration map' }),
    ).not.toBeInTheDocument()
  })

  it('shows appropriate empty states when discoveries are genuinely empty', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([])

    renderWithProviders(<ProfilePage />)

    expect(
      await screen.findByText('No countries explored yet.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No discoveries recorded in the last 6 months.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No recent discoveries yet.')).toBeInTheDocument()
  })

  it('opens accessible account drawer, dismisses on Escape, and resets deletion state', async () => {
    getAuthoredDiscoveriesMock.mockResolvedValue([])

    renderWithProviders(<ProfilePage />)

    const openButton = await screen.findByRole('button', {
      name: 'Open account settings',
    })
    fireEvent.click(openButton)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Account')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: 'secret' } })
    expect(passwordInput).toHaveValue('secret')

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    fireEvent.click(openButton)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Delete account' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })
})
