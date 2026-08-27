import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { saveSession } from '@/lib/session'
import { renderWithProviders } from './test/renderWithProviders'

const { mapCanvasLifecycle } = vi.hoisted(() => ({
  mapCanvasLifecycle: { mounts: 0, unmounts: 0, resizes: 0 },
}))

vi.mock('@/components/MapCanvas', async () => {
  const React = await import('react')

  return {
    MapCanvas: React.forwardRef<
      { locate: () => void; resize: () => void },
      { onSelectDiscovery?: (id: number) => void }
    >(function MapCanvasMock({ onSelectDiscovery }, ref) {
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
    renderWithProviders(<App />, { route: '/collection' })

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
      screen.getByRole('heading', { level: 1, name: 'Explore Paris' }),
    ).toBeInTheDocument()
  })

  it('keeps map controls below the status bar inset', () => {
    renderWithProviders(<App />, { route: '/' })

    expect(screen.getByRole('group', { name: 'Map controls' })).toHaveClass(
      'sterna-map-controls',
    )
  })

  it('keeps the map mounted behind a discovery opened from the map', () => {
    renderWithProviders(<App />, { route: '/' })

    const mapCanvas = screen.getByRole('button', {
      name: 'View discovery 1',
    })
    const mapPage = screen
      .getByRole('heading', { level: 1, name: 'Explore Paris' })
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

  it('renders the collection through its application route', () => {
    renderWithProviders(<App />, { route: '/collection' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your discoveries' }),
    ).toBeInTheDocument()
  })

  it('keeps one map canvas through authenticated navigation and resizes it on return', () => {
    renderWithProviders(<App />, { route: '/' })
    const mapPage = screen
      .getByRole('heading', { level: 1, name: 'Explore Paris' })
      .closest('main')!

    expect(mapCanvasLifecycle).toEqual({ mounts: 1, unmounts: 0, resizes: 1 })

    fireEvent.click(screen.getByRole('link', { name: 'Collection' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your discoveries' }),
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
      screen.getByRole('heading', { level: 1, name: 'Explore Paris' }),
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
      screen.getByRole('heading', { level: 1, name: 'Explore Paris' }),
    ).toBeInTheDocument()
  })

  it('returns to the collection when backing out of a discovery opened from the collection', () => {
    renderWithProviders(<App />, {
      initialEntries: ['/collection', '/discoveries/1'],
      initialIndex: 1,
    })

    expect(
      screen.queryByRole('button', { name: 'View discovery 1' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your discoveries' }),
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

  it('renders the profile exploration summary and supporting details', async () => {
    renderWithProviders(<App />, { route: '/profile' })

    await screen.findByText('Street in Le Marais')

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
    expect(accountButton).toHaveClass('size-[68px]')
    expect(accountButton).toHaveClass('-translate-x-2.5')
    expect(within(accountButton).getByText('E')).toBeInTheDocument()
    expect(screen.getByText('Explorer · Since 2026')).toHaveClass('mt-2')
    expect(
      within(screen.getByLabelText('Exploration statistics')).getByText(
        'Countries',
      ).parentElement,
    ).toHaveClass('before:h-10', 'before:bg-white/15')
    expect(screen.getByText('Discoveries')).toBeInTheDocument()
    expect(screen.getByText('Countries')).toBeInTheDocument()
    expect(screen.getByText('POIs')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Street in Le Marais')).toBeInTheDocument()
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

  it('shows each category as a labeled mobile-friendly progress row', async () => {
    renderWithProviders(<App />, { route: '/profile' })

    const categorySection = screen.getByRole('region', {
      name: 'Discoveries by category',
    })
    await within(categorySection).findByRole('progressbar', {
      name: 'Monument discoveries: 2',
    })
    const progressBars = within(categorySection).getAllByRole('progressbar')

    expect(progressBars).toHaveLength(5)
    expect(
      within(categorySection).getByRole('progressbar', {
        name: 'Monument discoveries: 2',
      }),
    ).toHaveAttribute('aria-valuenow', '100')
    const landscapeProgress = within(categorySection).getByRole('progressbar', {
      name: 'Landscape discoveries: 1',
    })
    expect(landscapeProgress).toHaveAttribute('aria-valuenow', '50')
    expect(landscapeProgress).toHaveAttribute(
      'aria-valuetext',
      '1 discovery in Landscape',
    )
    expect(within(categorySection).getByText('Landscape')).toBeInTheDocument()
  })

  it('links from recent discoveries to the collection', () => {
    renderWithProviders(<App />, { route: '/profile' })

    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/collection',
    )
  })

  it('groups identity and primary statistics in the profile overview', () => {
    renderWithProviders(<App />, { route: '/profile' })

    const overview = screen.getByRole('region', { name: 'Profile overview' })

    expect(within(overview).getByText('Explorer')).toBeInTheDocument()
    expect(within(overview).getByText('Discoveries')).toBeInTheDocument()
    expect(within(overview).getByText('Countries')).toBeInTheDocument()
    expect(within(overview).getByText('POIs')).toBeInTheDocument()
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
