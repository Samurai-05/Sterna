import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  getAllGroupDiscoveries,
  getAuthoredDiscoveries,
  getAuthoredPois,
  getPois,
} from '@/lib/api'
import { discoveries as sampleDiscoveries, landmarks } from '@/lib/mock-data'
import { saveSession } from '@/lib/session'
import { renderWithProviders } from './test/renderWithProviders'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  const { discoveries, landmarks } = await import('@/lib/mock-data')
  const personalDiscoveries = [
    {
      ...discoveries[3],
      id: 101,
      name: 'Personal garden',
      category: 'other',
      userId: '1',
      personal: true,
      groupId: null,
      groupIds: [],
    },
    {
      ...discoveries[4],
      id: 102,
      name: "Alex's personal beach",
      category: 'culture',
      userId: '2',
      personal: true,
      groupId: null,
      groupIds: [],
    },
  ]

  return {
    ...actual,
    getCurrentUser: vi.fn().mockResolvedValue({
      id: '1',
      email: 'explorer@sterna.app',
      userName: 'Explorer',
      createdAt: '2026-08-26T08:00:00.000Z',
    }),
    getAuthoredDiscoveries: vi
      .fn()
      .mockResolvedValue([
        ...discoveries.map((discovery) => ({ ...discovery, userId: '1' })),
        personalDiscoveries[0],
      ]),
    getAllGroupDiscoveries: vi.fn().mockResolvedValue([
      {
        ...discoveries[0],
        id: 7,
        userId: '1',
        groupId: 'weekend-paris',
        groupIds: ['weekend-paris'],
        personal: false,
      },
      {
        ...personalDiscoveries[1],
        id: 8,
        name: "Alex's group photo",
        author: 'Alex',
        initials: 'A',
        groupId: 'weekend-paris',
        groupIds: ['weekend-paris'],
        personal: false,
      },
    ]),
    getAuthoredPois: vi.fn().mockResolvedValue(landmarks),
    getDiscoveries: vi.fn().mockResolvedValue(discoveries),
    getGroups: vi.fn().mockResolvedValue([
      {
        id: 'weekend-paris',
        name: 'Weekend Paris',
        description: null,
        role: 'member',
        isActive: false,
        memberCount: 2,
        discoveryCount: 1,
      },
    ]),
    getGroupDiscoveries: vi.fn().mockResolvedValue([
      {
        ...discoveries[0],
        id: 7,
        userId: '1',
        groupId: 'weekend-paris',
        groupIds: ['weekend-paris'],
        personal: false,
      },
    ]),
    getPois: vi.fn().mockResolvedValue(landmarks),
  }
})

const { mapCanvasLifecycle } = vi.hoisted(() => ({
  mapCanvasLifecycle: { mounts: 0, unmounts: 0, resizes: 0 },
}))

vi.mock('@/components/MapCanvas', async () => {
  const React = await import('react')

  return {
    MapCanvas: React.forwardRef<
      { locate: () => void; resize: () => void; flyTo: () => void },
      {
        initialViewport?: { center: [number, number]; zoom: number }
        discoveries?: unknown[]
        landmarks?: unknown[]
        onSelectDiscovery?: (id: number) => void
      }
    >(function MapCanvasMock(
      { discoveries = [], landmarks = [], onSelectDiscovery },
      ref,
    ) {
      React.useEffect(() => {
        mapCanvasLifecycle.mounts += 1
        return () => {
          mapCanvasLifecycle.unmounts += 1
        }
      }, [])

      React.useImperativeHandle(
        ref,
        () => ({
          locate: () => {},
          flyTo: () => {},
          resize: () => {
            mapCanvasLifecycle.resizes += 1
          },
        }),
        [],
      )

      return (
        <button
          type="button"
          aria-label="View discovery 1"
          onClick={() => onSelectDiscovery?.(1)}
        >
          Map canvas
          <span data-testid="map-discovery-count">{discoveries.length}</span>
          <span data-testid="map-poi-count">{landmarks.length}</span>
        </button>
      )
    }),
  }
})

vi.mock('@/lib/photo-capture', () => ({
  createDiscoveryPhotoAction: ({
    navigate,
  }: {
    navigate: (to: string) => void
  }) => navigate('/add'),
}))

describe('App', () => {
  // A signed-out visit to "/" redirects to the authentication entry screen,
  // so these tests act as an already-signed-in user reaching the map, the
  // same way a returning user would.
  beforeEach(() => {
    mapCanvasLifecycle.mounts = 0
    mapCanvasLifecycle.unmounts = 0
    mapCanvasLifecycle.resizes = 0
    saveSession({
      accessToken: 'test-token',
      user: {
        id: '1',
        email: 'explorer@sterna.app',
        userName: 'Explorer',
        createdAt: '2026-08-26T08:00:00.000Z',
      },
    })
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('redirects a signed-out visit to the authentication entry screen', () => {
    window.localStorage.clear()
    renderWithProviders(<App />, { route: '/' })

    expect(mapCanvasLifecycle).toEqual({ mounts: 0, unmounts: 0, resizes: 0 })
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Keep your discoveries close',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('redirects a signed-out application route to the authentication entry', () => {
    window.localStorage.clear()
    renderWithProviders(<App />, { route: '/collection?group=weekend-paris' })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Keep your discoveries close',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Your discoveries' }),
    ).not.toBeInTheDocument()
  })

  it('renders the welcome screen at the authentication entry route', () => {
    renderWithProviders(<App />, { route: '/auth' })

    expect(screen.getByRole('main')).toHaveClass(
      'sterna-auth-welcome',
      'overflow-hidden',
    )
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Keep your discoveries close',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/register')
    const loginLink = screen.getByRole('link', { name: 'Log in' })
    expect(loginLink).toHaveAttribute('href', '/login')
    expect(loginLink).toHaveClass('!bg-white')
    expect(loginLink).not.toHaveClass('backdrop-blur-sm')
    expect(screen.getByRole('img', { name: 'Sterna logo' })).toBeInTheDocument()
    expect(screen.getByText('Sterna', { selector: 'span' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Aerial coastline with a coastal road',
      }),
    ).toBeInTheDocument()
  })

  it('navigates from the welcome screen to register', () => {
    renderWithProviders(<App />, { route: '/auth' })

    fireEvent.click(screen.getByRole('link', { name: 'Create an account' }))
    expect(
      screen.getByRole('heading', { name: 'Create your account' }),
    ).toBeInTheDocument()
  })

  it('navigates from the welcome screen to login', () => {
    renderWithProviders(<App />, { route: '/auth' })
    fireEvent.click(screen.getByRole('link', { name: 'Log in' }))
    expect(
      screen.getByRole('heading', { name: 'Welcome back' }),
    ).toBeInTheDocument()
  })

  it('renders the map at the application root route', () => {
    renderWithProviders(<App />, { route: '/' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Explore map' }),
    ).toBeInTheDocument()
  })

  it('filters the map down to POIs or one discovery category', async () => {
    renderWithProviders(<App />, { route: '/' })

    await waitFor(() =>
      expect(
        Number(screen.getByTestId('map-poi-count').textContent),
      ).toBeGreaterThan(0),
    )

    const poiFilter = screen.getByRole('button', { name: 'POIs' })
    expect(poiFilter).toHaveClass('bg-card/95')
    fireEvent.click(poiFilter)
    expect(poiFilter).toHaveClass('bg-[#FEF9C3]', 'ring-[#EAB308]')
    expect(screen.getByTestId('map-discovery-count')).toHaveTextContent('0')
    expect(
      Number(screen.getByTestId('map-poi-count').textContent),
    ).toBeGreaterThan(0)

    const animalFilter = screen.getByRole('button', { name: 'Animal' })
    expect(animalFilter).toHaveClass('bg-card/95')
    expect(animalFilter).not.toHaveClass('bg-[#CFFAFE]')
    fireEvent.click(animalFilter)
    expect(animalFilter).toHaveClass('bg-[#CFFAFE]', 'ring-[#0891B2]', 'ring-2')
    expect(
      Number(screen.getByTestId('map-discovery-count').textContent),
    ).toBeGreaterThan(0)
    expect(screen.getByTestId('map-poi-count')).toHaveTextContent('0')
  })

  it('keeps map controls below the status bar inset', () => {
    renderWithProviders(<App />, { route: '/' })

    expect(screen.getByRole('group', { name: 'Map controls' })).toHaveClass(
      'sterna-map-controls',
    )
  })

  it('uses a person icon for the personal map selector', async () => {
    renderWithProviders(<App />, { route: '/' })

    const personalMapName = await screen.findByText("Explorer's map")
    const selector = personalMapName.closest('button')!

    expect(selector.querySelector('.lucide-user-round')).toBeInTheDocument()
    expect(within(selector).queryByText('E')).not.toBeInTheDocument()
  })

  it('keeps the map mounted behind a discovery opened from the map', () => {
    renderWithProviders(<App />, { route: '/' })

    const mapCanvas = screen.getByRole('button', {
      name: 'View discovery 1',
    })
    const mapPage = screen
      .getByRole('heading', { level: 1, name: 'Explore map' })
      .closest('main')!

    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })

    fireEvent.click(mapCanvas)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Discovery' }),
    ).toBeInTheDocument()
    expect(mapPage).toContainElement(mapCanvas)
    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })
    expect(mapPage).toHaveAttribute('inert')
    expect(mapPage).toHaveAttribute('aria-hidden', 'true')
    expect(
      screen.queryByRole('group', { name: 'Map controls' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    expect(screen.getByRole('button', { name: 'View discovery 1' })).toBe(
      mapCanvas,
    )
    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })
    expect(mapPage).not.toHaveAttribute('inert')
    expect(mapPage).not.toHaveAttribute('aria-hidden')
  })

  it('keeps the Collection layout while showing Gallery without a page title', () => {
    renderWithProviders(<App />, { route: '/collection' })

    expect(screen.getByRole('link', { name: 'Gallery' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Your discoveries' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Search gallery' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Food' })).toHaveClass('bg-card')
    expect(
      screen.getByRole('group', { name: 'Filter gallery by source' }),
    ).toHaveClass('overflow-x-auto')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('filters Gallery discoveries in photo grid mode without changing visible POIs', async () => {
    renderWithProviders(<App />, { route: '/collection' })

    expect(screen.getByRole('link', { name: 'Gallery' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Your discoveries' }),
    ).not.toBeInTheDocument()
    const groupFilters = await screen.findByRole('group', {
      name: 'Filter gallery by source',
    })
    expect(
      within(groupFilters).getByRole('button', { name: "Explorer's map" }),
    ).toHaveAttribute('aria-pressed', 'true')
    const weekendParisOption = await within(groupFilters).findByRole('button', {
      name: 'Weekend Paris',
    })

    fireEvent.click(weekendParisOption)
    expect(
      within(groupFilters).getByRole('button', { name: 'Weekend Paris' }),
    ).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to photo grid' }),
    )

    const galleryPhoto = await screen.findByRole('link', {
      name: 'Street in Le Marais',
    })
    expect(galleryPhoto).toHaveClass('aspect-square')
    expect(
      screen.getByRole('button', { name: 'Switch to detailed view' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Parisian Croissant' }),
    ).not.toBeInTheDocument()
    const poiPhoto = await screen.findByRole('link', {
      name: /Eiffel Tower/,
    })
    expect(poiPhoto).toHaveClass('aspect-square')
    expect(within(poiPhoto).queryByText('Eiffel Tower')).not.toBeInTheDocument()
    expect(
      within(poiPhoto).queryByText('Paris, France'),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to detailed view' }),
    )
    const discoveryCard = await screen.findByRole('link', {
      name: /Street in Le Marais/,
    })
    expect(within(discoveryCard).getByText('France')).toBeInTheDocument()
    expect(
      within(discoveryCard).queryByText(/48\.\d+.*2\.\d+/),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to photo grid' }),
    )

    fireEvent.click(
      await screen.findByRole('link', { name: 'Street in Le Marais' }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Discovery' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    const restoredGroupFilters = await screen.findByRole('group', {
      name: 'Filter gallery by source',
    })
    expect(
      within(restoredGroupFilters).getByRole('button', {
        name: 'Weekend Paris',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Switch to detailed view' }),
    ).toBeInTheDocument()
  })

  it('keeps the selected Gallery view after visiting another page', async () => {
    renderWithProviders(<App />, { route: '/collection' })

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to photo grid' }),
    )
    expect(
      screen.getByRole('button', { name: 'Switch to detailed view' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Map' }))
    fireEvent.click(screen.getByRole('link', { name: 'Gallery' }))

    expect(
      screen.getByRole('button', { name: 'Switch to detailed view' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to detailed view' }),
    )
    fireEvent.click(screen.getByRole('link', { name: 'Map' }))
    fireEvent.click(screen.getByRole('link', { name: 'Gallery' }))

    expect(
      screen.getByRole('button', { name: 'Switch to photo grid' }),
    ).toBeInTheDocument()
  })

  it("shows every member's photos through the All groups filter", async () => {
    renderWithProviders(<App />, { route: '/collection' })

    const sourceFilters = await screen.findByRole('group', {
      name: 'Filter gallery by source',
    })
    fireEvent.click(
      within(sourceFilters).getByRole('button', { name: 'All groups' }),
    )

    const alexCard = await screen.findByRole('link', {
      name: /Alex's group photo/,
    })
    expect(alexCard).toHaveTextContent('Alex')
    expect(getAllGroupDiscoveries).toHaveBeenCalledWith('test-token')

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to photo grid' }),
    )
    const alexPhoto = await screen.findByRole('link', {
      name: /Alex's group photo.*Alex/,
    })
    expect(alexPhoto).toHaveAttribute(
      'href',
      '/discoveries/8?group=weekend-paris',
    )
  })

  it("filters the Gallery to the signed-in user's personal map", async () => {
    renderWithProviders(<App />, { route: '/collection' })

    const sourceFilters = await screen.findByRole('group', {
      name: 'Filter gallery by source',
    })
    expect(
      within(sourceFilters).getByRole('button', { name: "Explorer's map" }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.queryByRole('link', { name: /Personal garden/ }),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /Street in Le Marais/ }),
    ).toBeInTheDocument()
  })

  it('keeps existing POI filtering and cards unchanged by the group filter', async () => {
    vi.mocked(getPois).mockResolvedValueOnce([
      landmarks[0],
      { ...landmarks[1], discovered: false },
    ])
    renderWithProviders(<App />, { route: '/collection' })
    const galleryPage = screen
      .getByRole('textbox', { name: 'Search gallery' })
      .closest('main')!

    fireEvent.click(within(galleryPage).getByRole('button', { name: 'POIs' }))

    expect(
      within(galleryPage).queryByRole('group', {
        name: 'Filter gallery by source',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(galleryPage).getByRole('button', {
        name: 'Switch to photo grid',
      }),
    ).toBeInTheDocument()

    expect(
      await within(galleryPage).findByRole('link', {
        name: /Eiffel Tower/,
      }),
    ).toBeInTheDocument()
    expect(
      within(galleryPage).queryByRole('link', {
        name: /Arc de Triomphe/,
      }),
    ).not.toBeInTheDocument()

    expect(
      within(galleryPage).queryByText('Street in Le Marais'),
    ).not.toBeInTheDocument()
    expect(within(galleryPage).getByText('1 POI')).toBeInTheDocument()

    fireEvent.click(
      within(galleryPage).getByRole('button', {
        name: 'Switch to photo grid',
      }),
    )
    const poiPhoto = within(galleryPage).getByRole('link', {
      name: /Eiffel Tower/,
    })
    expect(poiPhoto).toHaveClass('aspect-square')
    expect(
      within(poiPhoto).queryByText('Paris, France'),
    ).not.toBeInTheDocument()

    fireEvent.click(poiPhoto)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Point of interest' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getByRole('button', { name: 'POIs' })).toBeInTheDocument()
  })

  it('keeps one map canvas through authenticated navigation and resizes it on return', () => {
    renderWithProviders(<App />, { route: '/' })
    const mapPage = screen
      .getByRole('heading', { level: 1, name: 'Explore map' })
      .closest('main')!

    expect(mapCanvasLifecycle).toEqual({ mounts: 1, unmounts: 0, resizes: 1 })

    fireEvent.click(screen.getByRole('link', { name: 'Gallery' }))
    expect(
      screen.getByRole('textbox', { name: 'Search gallery' }),
    ).toBeInTheDocument()
    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })
    expect(mapPage).toHaveAttribute('inert')
    expect(mapPage).toHaveAttribute('aria-hidden', 'true')
    expect(
      screen.queryByRole('group', { name: 'Map controls' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Map' }))
    expect(mapCanvasLifecycle).toEqual({ mounts: 1, unmounts: 0, resizes: 2 })

    fireEvent.click(screen.getByRole('link', { name: 'Groups' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Groups' }),
    ).toBeInTheDocument()
    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })

    fireEvent.click(screen.getByRole('link', { name: 'Map' }))
    fireEvent.click(screen.getByRole('link', { name: 'Me' }))
    expect(
      screen.getByRole('button', { name: 'Open account settings' }),
    ).toBeInTheDocument()
    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })

    fireEvent.click(screen.getByRole('link', { name: 'Map' }))
    fireEvent.click(screen.getByRole('link', { name: 'Search places' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Search a place' }),
    ).toBeInTheDocument()
    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add discovery' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'New discovery' }),
    ).toBeInTheDocument()
    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(mapCanvasLifecycle).toEqual({ mounts: 1, unmounts: 0, resizes: 6 })
  })

  it('unmounts the persistent map when logging out', () => {
    renderWithProviders(<App />, { route: '/profile' })

    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 0 })

    fireEvent.click(
      screen.getByRole('button', { name: 'Open account settings' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Keep your discoveries close',
      }),
    ).toBeInTheDocument()
    expect(mapCanvasLifecycle).toMatchObject({ mounts: 1, unmounts: 1 })
  })

  it('returns to the map when backing out of a discovery opened from the map', () => {
    renderWithProviders(<App />, {
      initialEntries: [
        '/',
        { pathname: '/discoveries/1', state: { returnTo: '/' } },
      ],
      initialIndex: 1,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Explore map' }),
    ).toBeInTheDocument()
  })

  it('returns to the map, not whatever else is in history, when backing out of a discovery opened from the map', () => {
    renderWithProviders(<App />, {
      initialEntries: [
        '/',
        '/collection',
        { pathname: '/discoveries/1', state: { returnTo: '/' } },
      ],
      initialIndex: 2,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Explore map' }),
    ).toBeInTheDocument()
  })

  it('returns to the Gallery when backing out of a discovery opened from the Gallery', () => {
    renderWithProviders(<App />, {
      initialEntries: ['/collection', '/discoveries/1'],
      initialIndex: 1,
    })

    expect(
      screen.queryByRole('button', { name: 'View discovery 1' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    expect(
      screen.getByRole('textbox', { name: 'Search gallery' }),
    ).toBeInTheDocument()
  })

  it('renders a direct discovery visit as a normal page', () => {
    renderWithProviders(<App />, { route: '/discoveries/1' })

    const discoveryPage = screen
      .getByRole('heading', { level: 1, name: 'Discovery' })
      .closest('main')!

    expect(discoveryPage).toHaveClass('min-h-dvh')
    expect(discoveryPage).not.toHaveClass('fixed')
    expect(
      screen.queryByRole('button', { name: 'View discovery 1' }),
    ).not.toBeInTheDocument()
  })

  it('shows a POI place instead of coordinates on its detail page', async () => {
    renderWithProviders(<App />, { route: '/landmarks/eiffel-tower' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Eiffel Tower' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Paris, France')).toBeInTheDocument()
    expect(screen.queryByText('48.85840, 2.29450')).not.toBeInTheDocument()
  })

  it('renders the profile exploration summary and supporting details', async () => {
    renderWithProviders(<App />, { route: '/profile' })

    await waitFor(() =>
      expect(getAuthoredDiscoveries).toHaveBeenCalledWith('test-token'),
    )
    expect(getAuthoredPois).toHaveBeenCalledWith('test-token')

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Profile' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Profile settings' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Open account settings' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Explorer')).toBeInTheDocument()
    const accountButton = screen.getByRole('button', {
      name: 'Open account settings',
    })
    expect(accountButton).toHaveClass('size-14', 'text-[22px]')
    expect(accountButton).toHaveClass('-translate-x-2.5')
    expect(within(accountButton).getByText('E')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Log out' }),
    ).not.toBeInTheDocument()
    fireEvent.click(accountButton)
    const accountSheet = screen.getByRole('dialog', { name: 'Account' })
    expect(accountSheet).toHaveClass(
      'max-h-[calc(100dvh-1rem)]',
      'overflow-y-auto',
      'touch-pan-y',
    )
    expect(accountSheet.parentElement).toHaveClass('z-[70]')
    expect(
      within(accountSheet).getByRole('button', { name: 'Log out' }),
    ).toBeInTheDocument()
    expect(within(accountSheet).getByText('Active')).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Profile overview')).getByText(
        'Explorer · Since 2026',
      ),
    ).toHaveClass('mt-2')
    expect(
      screen.queryByLabelText('Exploration statistics'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'POIs' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent' }),
    ).toBeInTheDocument()
    expect(
      (await screen.findByText('Street in Le Marais')).closest('a'),
    ).toHaveClass('w-[min(68vw,16rem)]')
    expect(
      screen.getByText('2 / 2 points of interest discovered'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Countries explored' }),
    ).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Discoveries by category',
      }),
    ).toBeInTheDocument()
  })

  it('shows explicit empty states for countries and recent discoveries', async () => {
    vi.mocked(getAuthoredDiscoveries).mockResolvedValueOnce([])

    renderWithProviders(<App />, { route: '/profile' })

    expect(
      await screen.findByText('No countries explored yet.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No recent discoveries yet.')).toBeInTheDocument()
    expect(
      screen.getByText('No discoveries created in the last 6 months.'),
    ).toBeInTheDocument()
  })

  it('shows discovery counts as a standard vertical bar chart', async () => {
    renderWithProviders(<App />, { route: '/profile' })

    const categorySection = screen.getByRole('region', {
      name: 'Discoveries by category',
    })
    expect(
      await within(categorySection).findByRole('list', {
        name: 'Discovery distribution by category',
      }),
    ).toBeInTheDocument()
    const monument = await within(categorySection).findByRole('listitem', {
      name: 'Monument: 2 discoveries',
    })
    const landscape = within(categorySection).getByRole('listitem', {
      name: 'Landscape: 1 discovery',
    })
    expect(
      monument.querySelector('[data-category-bar="monument"]'),
    ).toHaveStyle({ height: '100%' })
    expect(
      landscape.querySelector('[data-category-bar="landscape"]'),
    ).toHaveStyle({ height: '50%' })
    expect(
      within(categorySection).queryByRole('progressbar'),
    ).not.toBeInTheDocument()
    expect(
      within(categorySection).queryByText(
        "Bars show each category's share of your discoveries, not a goal or limit.",
      ),
    ).not.toBeInTheDocument()
  })

  it('plots discovery creation activity over the last six months', async () => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 10)
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10)
    const currentLabel = new Intl.DateTimeFormat('en', {
      month: 'short',
    }).format(currentMonth)
    const previousLabel = new Intl.DateTimeFormat('en', {
      month: 'short',
    }).format(previousMonth)
    vi.mocked(getAuthoredDiscoveries).mockResolvedValueOnce([
      { ...sampleDiscoveries[0], createdAt: currentMonth.toISOString() },
      { ...sampleDiscoveries[1], createdAt: currentMonth.toISOString() },
      { ...sampleDiscoveries[2], createdAt: previousMonth.toISOString() },
    ])

    renderWithProviders(<App />, { route: '/profile' })

    const chart = await screen.findByRole('img', {
      name: /Discovery creations by month:/,
    })
    expect(chart).toHaveAttribute(
      'aria-label',
      expect.stringContaining(`${previousLabel}: 1`),
    )
    expect(chart).toHaveAttribute(
      'aria-label',
      expect.stringContaining(`${currentLabel}: 2`),
    )
  })

  it('orders profile sections and gives them matching title styles', () => {
    renderWithProviders(<App />, { route: '/profile' })

    const profilePage = screen
      .getByRole('region', { name: 'Profile overview' })
      .closest('main')!
    const sectionTitles = within(profilePage)
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)

    expect(sectionTitles).toEqual([
      'Explorer',
      'POIs',
      'Discoveries by category',
      'Discovery activity',
      'Countries explored',
      'Recent',
    ])
    for (const title of [
      'POIs',
      'Discoveries by category',
      'Discovery activity',
      'Countries explored',
      'Recent',
    ]) {
      expect(
        within(profilePage).getByRole('heading', { level: 2, name: title }),
      ).toHaveClass('font-display', 'text-[22px]', 'leading-7')
    }
  })

  it('links from recent discoveries to the collection', () => {
    renderWithProviders(<App />, { route: '/profile' })

    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/collection',
    )
  })

  it('keeps the profile overview focused on identity', () => {
    renderWithProviders(<App />, { route: '/profile' })

    const overview = screen.getByRole('region', { name: 'Profile overview' })

    expect(within(overview).getByText('Explorer')).toBeInTheDocument()
    expect(within(overview).queryByText('Discoveries')).not.toBeInTheDocument()
    expect(within(overview).queryByText('Countries')).not.toBeInTheDocument()
  })

  it('labels the profile destination Me in the bottom navigation', () => {
    renderWithProviders(<App />, { route: '/profile' })

    expect(screen.getByRole('link', { name: 'Me' })).toHaveAttribute(
      'href',
      '/profile',
    )
    expect(
      screen.queryByRole('link', { name: 'Profile' }),
    ).not.toBeInTheDocument()
  })
})
