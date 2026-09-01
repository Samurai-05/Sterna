import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { renderWithProviders } from '@/test/renderWithProviders'
import { clearSession, saveSession } from '@/lib/session'
import {
  getDiscovery,
  getGroups,
  searchLocations,
  updateDiscovery,
} from '@/lib/api'
import { EditDiscoveryPage } from './EditDiscoveryPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getDiscovery: vi.fn(),
    getGroups: vi.fn(),
    searchLocations: vi.fn(),
    updateDiscovery: vi.fn(),
  }
})

const discovery = {
  id: 7,
  userId: '1',
  groupId: null,
  groupIds: [],
  personal: true,
  name: 'Original discovery',
  category: 'culture' as const,
  location: '46.5000, 6.6000',
  imageId: 'photo',
  imageObjectKey: 'photos/original.jpg',
  description: 'Original description',
  author: 'Explorer',
  initials: 'E',
  relativeDate: 'today',
  coordinates: [6.6, 46.5] as [number, number],
  countryCode: 'CHE',
}

const uncategorizedDiscovery = {
  ...discovery,
  category: null,
}

afterEach(() => {
  clearSession()
  vi.clearAllMocks()
})

describe('EditDiscoveryPage', () => {
  it('uses the visual category picker and searchable map from creation', async () => {
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
    vi.mocked(getDiscovery).mockResolvedValue(discovery)
    vi.mocked(getGroups).mockResolvedValue([])
    vi.mocked(searchLocations).mockResolvedValue([
      {
        id: 'relation:1688687',
        label: 'Lausanne, Vaud, Switzerland',
        type: 'city',
        longitude: 6.6327,
        latitude: 46.5218,
        zoom: 12,
      },
    ])
    vi.mocked(updateDiscovery).mockImplementation(async (input) => ({
      ...discovery,
      name: input.title,
      category: input.category ?? null,
      coordinates: [input.longitude, input.latitude],
    }))

    renderWithProviders(
      <Routes>
        <Route
          path="/discoveries/:discoveryId/edit"
          element={<EditDiscoveryPage />}
        />
        <Route path="/discoveries/:discoveryId" element={<p>Saved</p>} />
      </Routes>,
      { route: '/discoveries/7/edit' },
    )

    expect(await screen.findByDisplayValue('Original discovery')).toBeVisible()
    const animal = screen.getByRole('button', { name: 'Animal' })
    fireEvent.click(animal)
    expect(animal).toHaveAttribute('aria-pressed', 'true')

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Search for a location' }),
      { target: { value: 'Lausanne' } },
    )
    fireEvent.click(
      await screen.findByText(
        'Lausanne, Vaud, Switzerland',
        {},
        { timeout: 2000 },
      ),
    )
    expect(screen.getByText('46.52180, 6.63270')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(updateDiscovery).toHaveBeenCalled())
    expect(vi.mocked(updateDiscovery).mock.calls[0][0]).toMatchObject({
      category: 'animal',
      longitude: 6.6327,
      latitude: 46.5218,
    })
  })

  it('preserves an uncategorized discovery when saving without choosing a category', async () => {
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
    vi.mocked(getDiscovery).mockResolvedValue(uncategorizedDiscovery)
    vi.mocked(getGroups).mockResolvedValue([])
    vi.mocked(updateDiscovery).mockResolvedValue(uncategorizedDiscovery)

    renderWithProviders(
      <Routes>
        <Route
          path="/discoveries/:discoveryId/edit"
          element={<EditDiscoveryPage />}
        />
        <Route path="/discoveries/:discoveryId" element={<p>Saved</p>} />
      </Routes>,
      { route: '/discoveries/7/edit' },
    )

    expect(await screen.findByDisplayValue('Original discovery')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateDiscovery).toHaveBeenCalled())
    expect(vi.mocked(updateDiscovery).mock.calls[0][0]).not.toHaveProperty(
      'category',
    )
  })

  it('sends an explicitly selected category for an uncategorized discovery', async () => {
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
    vi.mocked(getDiscovery).mockResolvedValue(uncategorizedDiscovery)
    vi.mocked(getGroups).mockResolvedValue([])
    vi.mocked(updateDiscovery).mockResolvedValue({
      ...uncategorizedDiscovery,
      category: 'plant',
    })

    renderWithProviders(
      <Routes>
        <Route
          path="/discoveries/:discoveryId/edit"
          element={<EditDiscoveryPage />}
        />
        <Route path="/discoveries/:discoveryId" element={<p>Saved</p>} />
      </Routes>,
      { route: '/discoveries/7/edit' },
    )

    expect(await screen.findByDisplayValue('Original discovery')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Plant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateDiscovery).toHaveBeenCalled())
    expect(vi.mocked(updateDiscovery).mock.calls[0][0]).toMatchObject({
      category: 'plant',
    })
  })
})
