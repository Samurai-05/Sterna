import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  StrictMode,
  useState,
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

import {
  deleteDiscovery,
  getAllGroupDiscoveries,
  getDiscovery,
  getDiscoveries,
  getPhoto,
} from '@/lib/api'
import { saveSession } from '@/lib/session'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { getDiscoveryDetailExpandedSnapPoint } from '@/lib/discovery-detail'
import { DiscoveryDetailPage } from './DiscoveryDetailPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getDiscovery: vi.fn(),
    getDiscoveries: vi.fn(),
    getAllGroupDiscoveries: vi.fn(),
    getPhoto: vi.fn(),
    deleteDiscovery: vi.fn(),
  }
})

vi.mock('yet-another-react-lightbox', () => ({
  default: ({
    open,
    slides,
    index = 0,
    inline,
    on,
    onErrorCapture,
    render,
  }: {
    open: boolean
    slides: Array<{ src: string; alt?: string }>
    index?: number
    inline?: { className?: string; style?: CSSProperties }
    on?: { view?: (props: { index: number }) => void }
    onErrorCapture?: (event: SyntheticEvent<HTMLDivElement>) => void
    render?: {
      slide?: (props: { slide: { src: string; alt?: string } }) => ReactNode
    }
  }) =>
    open ? (
      <InlineLightboxTestDouble
        index={index}
        inline={inline}
        on={on}
        onErrorCapture={onErrorCapture}
        render={render}
        slides={slides}
      />
    ) : null,
}))

function InlineLightboxTestDouble({
  index,
  inline,
  on,
  onErrorCapture,
  render,
  slides,
}: {
  index: number
  inline?: { className?: string; style?: CSSProperties }
  on?: { view?: (props: { index: number }) => void }
  onErrorCapture?: (event: SyntheticEvent<HTMLDivElement>) => void
  render?: {
    slide?: (props: { slide: { src: string; alt?: string } }) => ReactNode
  }
  slides: Array<{ src: string; alt?: string }>
}) {
  const [activeIndex, setActiveIndex] = useState(index)
  const activeSlide = slides[activeIndex]

  return (
    <div
      data-testid="inline-photo-viewer"
      data-slide-count={slides.length}
      data-inline-width={inline?.style?.width}
      data-inline-height={inline?.style?.height}
      className={inline?.className}
      onErrorCapture={onErrorCapture}
      style={inline?.style}
    >
      {render?.slide?.({ slide: activeSlide }) ?? (
        <img src={activeSlide.src} alt={activeSlide.alt} />
      )}
      {slides.length > 1 && (
        <button
          type="button"
          data-testid="lightbox-next"
          onClick={() => {
            const nextIndex = Math.min(activeIndex + 1, slides.length - 1)
            setActiveIndex(nextIndex)
            on?.view?.({ index: nextIndex })
          }}
        >
          Next slide
        </button>
      )}
    </div>
  )
}

const getDiscoveryMock = vi.mocked(getDiscovery)
const getDiscoveriesMock = vi.mocked(getDiscoveries)
const getAllGroupDiscoveriesMock = vi.mocked(getAllGroupDiscoveries)
const getPhotoMock = vi.mocked(getPhoto)
const deleteDiscoveryMock = vi.mocked(deleteDiscovery)

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
  getDiscoveriesMock.mockResolvedValue([discovery])
  getAllGroupDiscoveriesMock.mockResolvedValue([discovery])
  getPhotoMock.mockResolvedValue(new Blob(['photo']))
  deleteDiscoveryMock.mockResolvedValue(undefined)
})

afterEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
})

function renderPage(
  state?: unknown,
  options: {
    initialPath?: string
    withPreviousContext?: boolean
    strictMode?: boolean
  } = {},
) {
  const detailPath = options.initialPath ?? '/discoveries/7'
  const initialEntries = options.withPreviousContext
    ? ['/collection', { pathname: detailPath, state }]
    : [{ pathname: detailPath, state }]

  const routes = (
    <>
      <Routes>
        <Route
          path="/discoveries/:discoveryId"
          element={<DiscoveryDetailPage />}
        />
      </Routes>
      <LocationProbe />
    </>
  )

  return renderWithProviders(
    options.strictMode ? <StrictMode>{routes}</StrictMode> : routes,
    {
      initialEntries,
      initialIndex: options.withPreviousContext ? 1 : undefined,
    },
  )
}

function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <output data-testid="location-probe">
        {location.pathname}
        {location.search}
      </output>
      <button type="button" onClick={() => navigate(-1)}>
        Browser back
      </button>
    </>
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

  it('gives Inline a measurable full-size container', async () => {
    renderPage()

    const viewer = await screen.findByTestId('inline-photo-viewer')

    expect(viewer).toHaveAttribute('data-inline-width', '100%')
    expect(viewer).toHaveAttribute('data-inline-height', '100%')
    expect(viewer).toHaveClass('absolute', 'inset-0')
  })

  it('keeps the carousel mounted and shows a local unavailable slide when one photo fails', async () => {
    const secondDiscovery = {
      ...discovery,
      id: 8,
      name: 'Broken lake',
      imageObjectKey: 'photos/broken.jpg',
    }
    const thirdDiscovery = {
      ...discovery,
      id: 9,
      name: 'Reachable summit',
      imageObjectKey: 'photos/summit.jpg',
    }
    getDiscoveriesMock.mockResolvedValue([
      discovery,
      secondDiscovery,
      thirdDiscovery,
    ])
    getPhotoMock.mockImplementation(async (_token, imageObjectKey) => {
      if (imageObjectKey === 'photos/broken.jpg') {
        throw new Error('photo unavailable')
      }
      return new Blob([imageObjectKey])
    })

    renderPage({
      returnTo: '/collection',
      galleryIds: [7, 8, 9],
      gallerySource: 'personal',
    })

    await screen.findByTestId('inline-photo-viewer')
    fireEvent.click(screen.getByTestId('lightbox-next'))
    expect(
      await screen.findByRole('status', { name: 'Photo unavailable' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('inline-photo-viewer')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('lightbox-next'))
    expect(
      await screen.findByRole('button', { name: 'Reachable summit' }),
    ).toBeVisible()
    expect(screen.getByRole('img', { name: 'Reachable summit' })).toBeVisible()
  })

  it('keeps authenticated gallery sources after StrictMode remounts the effect', async () => {
    renderPage(undefined, { strictMode: true })

    expect(
      await screen.findByRole('img', { name: 'Alpine meadow' }),
    ).toHaveAttribute('src', expect.stringContaining('blob:'))
    expect(screen.getByTestId('inline-photo-viewer')).toBeInTheDocument()
  })

  it('marks an undecodable authenticated photo unavailable and revokes its Blob URL', async () => {
    const imagePrototype = globalThis.Image.prototype
    const originalDecode = Object.getOwnPropertyDescriptor(
      imagePrototype,
      'decode',
    )
    Object.defineProperty(imagePrototype, 'decode', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('decode failed')),
    })
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')

    try {
      renderPage()

      expect(
        await screen.findByRole('status', { name: 'Photo unavailable' }),
      ).toBeInTheDocument()
      expect(screen.getByTestId('inline-photo-viewer')).toBeInTheDocument()
      expect(revokeObjectURL).toHaveBeenCalledWith(
        expect.stringContaining('blob:'),
      )
    } finally {
      if (originalDecode) {
        Object.defineProperty(imagePrototype, 'decode', originalDecode)
      } else {
        delete (imagePrototype as { decode?: unknown }).decode
      }
    }
  })

  it('turns a Lightbox image error into a local unavailable slide', async () => {
    renderPage()

    fireEvent.error(await screen.findByRole('img', { name: 'Alpine meadow' }))

    expect(
      await screen.findByRole('status', { name: 'Photo unavailable' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('inline-photo-viewer')).toBeInTheDocument()
  })

  it('synchronizes the active discovery and all drawer metadata with the carousel', async () => {
    const secondDiscovery = {
      ...discovery,
      id: 8,
      userId: '2',
      name: 'Lac de Bretaye',
      category: 'plant' as const,
      description: 'A lake framed by alpine meadows.',
      author: 'Friend',
      imageObjectKey: 'photos/lac.jpg',
    }
    getDiscoveriesMock.mockResolvedValue([discovery, secondDiscovery])
    getPhotoMock.mockImplementation(
      async (_token, imageObjectKey) => new Blob([imageObjectKey]),
    )

    renderPage({
      returnTo: '/collection',
      galleryIds: [7, 8],
      gallerySource: 'personal',
    })

    expect(await screen.findByTestId('inline-photo-viewer')).toHaveAttribute(
      'data-slide-count',
      '2',
    )
    fireEvent.click(screen.getByTestId('lightbox-next'))

    expect(
      await screen.findByRole('button', { name: 'Lac de Bretaye' }),
    ).toBeVisible()
    expect(getPhotoMock).toHaveBeenCalledTimes(2)
    expect(new Set(getPhotoMock.mock.calls.map((call) => call[1])).size).toBe(2)
    expect(screen.getByText('A lake framed by alpine meadows.')).toBeVisible()
    expect(screen.getByText('Plant')).toBeVisible()
    expect(screen.getByText(/Added by Friend/)).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'More actions' }),
    ).not.toBeInTheDocument()
  })

  it('exposes minimized, peek, and expanded drawer states sequentially', async () => {
    renderPage()

    const drawer = await screen.findByTestId('discovery-detail-drawer')
    expect(drawer).toHaveAttribute('data-snap-points', '1.75rem,5rem,expanded')
    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
    expect(screen.getByRole('button', { name: 'Alpine meadow' })).toBeVisible()

    const handle = screen.getByRole('button', { name: 'Collapse details' })
    expect(handle).toHaveAttribute('data-testid', 'drawer-handle')
    fireEvent.click(handle)
    expect(drawer).toHaveAttribute('data-drawer-state', 'minimized')
    expect(
      screen.queryByRole('button', { name: 'Alpine meadow' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expand details' }))
    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')

    fireEvent.click(screen.getByRole('button', { name: 'Alpine meadow' }))
    expect(
      await screen.findByText('A quiet meadow above the lake.'),
    ).toBeVisible()
    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')

    fireEvent.click(screen.getByRole('button', { name: 'Collapse details' }))
    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
  })

  it('replaces the URL on carousel changes so browser back leaves the gallery', async () => {
    const secondDiscovery = {
      ...discovery,
      id: 8,
      name: 'Lac de Bretaye',
      imageObjectKey: 'photos/lac.jpg',
    }
    getDiscoveriesMock.mockResolvedValue([discovery, secondDiscovery])

    renderPage(
      {
        returnTo: '/collection',
        galleryIds: [7, 8],
        gallerySource: 'personal',
      },
      { withPreviousContext: true },
    )

    fireEvent.click(await screen.findByTestId('lightbox-next'))
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/discoveries/8',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }))
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/collection',
    )
  })

  it('deletes a middle slide, displays its adjacent discovery, and replaces the URL with it', async () => {
    const secondDiscovery = {
      ...discovery,
      id: 8,
      name: 'Lac de Bretaye',
      imageObjectKey: 'photos/lac.jpg',
    }
    const thirdDiscovery = {
      ...discovery,
      id: 9,
      name: 'Dents du Midi',
      imageObjectKey: 'photos/dents.jpg',
    }
    getDiscoveriesMock.mockResolvedValue([
      discovery,
      secondDiscovery,
      thirdDiscovery,
    ])

    renderPage(
      {
        returnTo: '/collection',
        galleryIds: [7, 8, 9],
        gallerySource: 'personal',
      },
      {
        initialPath: '/discoveries/8',
      },
    )

    fireEvent.click(await screen.findByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete discovery' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete discovery' }))

    await waitFor(() =>
      expect(deleteDiscoveryMock).toHaveBeenCalledWith('test-token', '8'),
    )
    expect(
      await screen.findByRole('button', { name: 'Dents du Midi' }),
    ).toBeVisible()
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/discoveries/9',
    )
    expect(
      screen.queryByRole('button', { name: 'Lac de Bretaye' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'More actions' }),
    ).toBeInTheDocument()
  })

  it('uses the target discovery group when All Groups carousel navigation changes slides', async () => {
    const firstGroupDiscovery = {
      ...discovery,
      id: 7,
      name: 'Group 12 discovery',
      groupId: '12',
      groupIds: ['12'],
      personal: false,
    }
    const secondGroupDiscovery = {
      ...discovery,
      id: 8,
      name: 'Group 27 discovery',
      groupId: '27',
      groupIds: ['27'],
      personal: false,
      description: 'A different group context.',
      imageObjectKey: 'photos/group-27.jpg',
    }
    getAllGroupDiscoveriesMock.mockResolvedValue([
      firstGroupDiscovery,
      secondGroupDiscovery,
    ])

    renderPage(
      {
        returnTo: '/collection',
        galleryIds: [7, 8],
        gallerySource: 'all-groups',
      },
      { initialPath: '/discoveries/7?group=12' },
    )

    fireEvent.click(await screen.findByTestId('lightbox-next'))

    expect(
      await screen.findByRole('button', { name: 'Group 27 discovery' }),
    ).toBeVisible()
    expect(screen.getByText('A different group context.')).toBeVisible()
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/discoveries/8?group=27',
    )
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
