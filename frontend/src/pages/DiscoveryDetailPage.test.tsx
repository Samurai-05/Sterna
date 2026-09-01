import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getDiscovery, getPhoto } from '@/lib/api'
import { saveSession } from '@/lib/session'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Route, Routes } from 'react-router'
import { getDiscoveryDetailExpandedSnapPoint } from '@/lib/discovery-detail'
import { DiscoveryDetailPage } from './DiscoveryDetailPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getDiscovery: vi.fn(),
    getPhoto: vi.fn(),
    deleteDiscovery: vi.fn(),
  }
})

vi.mock('yet-another-react-lightbox', () => ({
  default: ({
    open,
    slides,
  }: {
    open: boolean
    slides: Array<{ src: string; alt?: string }>
  }) =>
    open ? (
      <div data-testid="inline-photo-viewer">
        <img src={slides[0].src} alt={slides[0].alt} />
      </div>
    ) : null,
}))

const getDiscoveryMock = vi.mocked(getDiscovery)
const getPhotoMock = vi.mocked(getPhoto)

const discovery = {
  id: 7,
  userId: '1',
  groupId: null,
  groupIds: [],
  personal: true,
  name: 'Alpine meadow',
  category: 'landscape' as const,
  location: '46.7000, 6.6000',
  imageId: 'fallback',
  imageObjectKey: 'photos/alpine.jpg',
  description: 'A quiet meadow above the lake.',
  author: 'Explorer',
  initials: 'E',
  relativeDate: 'today',
  countryCode: 'CHE',
  coordinates: [6.6, 46.7] as [number, number],
}

beforeEach(() => {
  saveSession({
    accessToken: 'test-token',
    user: {
      id: '1',
      email: 'explorer@example.test',
      userName: 'Explorer',
      avatarObjectKey: null,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  })
  getDiscoveryMock.mockResolvedValue(discovery)
  getPhotoMock.mockResolvedValue(new Blob(['photo']))
})

afterEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
})

function renderPage(state?: unknown) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/discoveries/:discoveryId"
        element={<DiscoveryDetailPage />}
      />
    </Routes>,
    {
      initialEntries: [{ pathname: '/discoveries/7', state }],
    },
  )
}

describe('DiscoveryDetailPage', () => {
  it('caps the expanded snap point at half the viewport without enlarging short content', () => {
    expect(
      getDiscoveryDetailExpandedSnapPoint({
        contentHeight: 120,
        controlsHeight: 56,
        viewportHeight: 800,
      }),
    ).toBeCloseTo(0.22)
    expect(
      getDiscoveryDetailExpandedSnapPoint({
        contentHeight: 600,
        controlsHeight: 56,
        viewportHeight: 800,
      }),
    ).toBe(0.5)
  })

  it('uses the photo-first layout with a peek drawer and no conventional page title', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Alpine meadow' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Discovery' }),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('discovery-detail-drawer')).toHaveAttribute(
      'data-snap-point',
      '5rem',
    )
    const expandedContent = screen.getByTestId(
      'discovery-detail-expanded-content',
    )
    expect(expandedContent).toHaveAttribute('aria-hidden', 'true')
    expect(expandedContent).toHaveClass('invisible')
  })

  it('toggles the normal drawer from the title area', async () => {
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(320)
    const bounds = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 56 } as DOMRect)

    renderPage()

    const titleToggle = await screen.findByRole('button', {
      name: 'Alpine meadow',
    })
    await waitFor(() =>
      expect(screen.getByTestId('discovery-detail-drawer')).not.toHaveAttribute(
        'data-expanded-snap-point',
        'null',
      ),
    )
    expect(titleToggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(titleToggle)
    await waitFor(() =>
      expect(titleToggle).toHaveAttribute('aria-expanded', 'true'),
    )

    fireEvent.click(titleToggle)
    expect(titleToggle).toHaveAttribute('aria-expanded', 'false')

    scrollHeight.mockRestore()
    bounds.mockRestore()
  })

  it('keeps author actions accessible from the compact drawer', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Alpine meadow' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: 'Edit discovery' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      screen.getByRole('menuitem', { name: 'Edit discovery' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Delete discovery' }),
    ).toBeInTheDocument()
  })

  it('keeps the photo in the unified inline viewer without opening a dialog', async () => {
    renderPage()

    const photo = await screen.findByRole('img', { name: 'Alpine meadow' })
    expect(getPhotoMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('inline-photo-viewer')).toBeInTheDocument()

    fireEvent.click(photo)

    expect(
      screen.queryByRole('dialog', { name: 'Photo viewer' }),
    ).not.toBeInTheDocument()
    expect(getPhotoMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the discovery title visible in the collapsed drawer', async () => {
    renderPage()

    const title = await screen.findByRole('button', { name: 'Alpine meadow' })
    expect(title).toBeVisible()
    expect(screen.getByTestId('discovery-detail-drawer')).toBeInTheDocument()
    expect(
      document.querySelectorAll('[data-slot="drawer-swipe-handle"]'),
    ).toHaveLength(1)
  })

  it('shows expanded discovery details from the main drawer', async () => {
    renderPage()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )

    expect(
      await screen.findByText('A quiet meadow above the lake.'),
    ).toBeVisible()
    expect(screen.getByText('Personal map')).toBeVisible()
  })

  it('shows and automatically hides the post-creation confirmation', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      renderPage({ returnTo: '/', justCreated: true })
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      await screen.findByRole('heading', { name: 'Alpine meadow' })

      expect(
        screen.getByRole('status', { name: 'Discovery added' }),
      ).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1_200)
      })

      expect(
        screen.queryByRole('status', { name: 'Discovery added' }),
      ).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
