import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getDiscovery, getPhoto } from '@/lib/api'
import { saveSession } from '@/lib/session'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Route, Routes } from 'react-router'
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
    close,
    slides,
  }: {
    open: boolean
    close: () => void
    slides: Array<{ src: string; alt?: string }>
  }) =>
    open ? (
      <div role="dialog" aria-label="Photo viewer">
        <button type="button" onClick={close}>
          Close
        </button>
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

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route
        path="/discoveries/:discoveryId"
        element={<DiscoveryDetailPage />}
      />
    </Routes>,
    { route: '/discoveries/7' },
  )
}

describe('DiscoveryDetailPage', () => {
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
    expect(screen.queryByText('46.7000, 6.6000')).not.toBeInTheDocument()
    expect(screen.queryByText('today')).not.toBeInTheDocument()
    expect(
      screen.queryByText('A quiet meadow above the lake.'),
    ).not.toBeInTheDocument()
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

  it('opens and closes the viewer without requesting the detail photo again', async () => {
    renderPage()

    const photo = await screen.findByRole('img', { name: 'Alpine meadow' })
    expect(getPhotoMock).toHaveBeenCalledTimes(1)

    fireEvent.click(photo)

    expect(
      await screen.findByRole('dialog', { name: 'Photo viewer' }),
    ).toBeInTheDocument()
    expect(getPhotoMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Photo viewer' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.getByRole('heading', { name: 'Alpine meadow' }),
    ).toBeInTheDocument()
  })
})
