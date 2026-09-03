import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  StrictMode,
  useEffect,
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
  getGroups,
  getPhoto,
  setActiveMap,
} from '@/lib/api'
import { saveSession } from '@/lib/session'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { DiscoveryDetailPage } from './DiscoveryDetailPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getDiscovery: vi.fn(),
    getDiscoveries: vi.fn(),
    getAllGroupDiscoveries: vi.fn(),
    getGroups: vi.fn(),
    getPhoto: vi.fn(),
    deleteDiscovery: vi.fn(),
    setActiveMap: vi.fn(),
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
    carousel,
    animation,
    zoom,
    controller,
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
    carousel?: { preload?: number; imageFit?: string; padding?: number }
    animation?: { fade?: number; swipe?: number }
    zoom?: {
      ref?: (value: { zoom: number } | null) => void
      maxZoomPixelRatio?: number
      doubleTapDelay?: number
      scrollToZoom?: boolean
    }
    controller?: {
      closeOnBackdropClick?: boolean
      closeOnEscape?: boolean
    }
  }) =>
    open ? (
      <InlineLightboxTestDouble
        index={index}
        inline={inline}
        on={on}
        onErrorCapture={onErrorCapture}
        render={render}
        carousel={carousel}
        animation={animation}
        zoom={zoom}
        controller={controller}
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
  carousel,
  animation,
  zoom,
  controller,
  slides,
}: {
  index: number
  inline?: { className?: string; style?: CSSProperties }
  on?: { view?: (props: { index: number }) => void }
  onErrorCapture?: (event: SyntheticEvent<HTMLDivElement>) => void
  render?: {
    slide?: (props: { slide: { src: string; alt?: string } }) => ReactNode
  }
  carousel?: { preload?: number; imageFit?: string; padding?: number }
  animation?: { fade?: number; swipe?: number }
  zoom?: {
    ref?: (value: { zoom: number } | null) => void
    maxZoomPixelRatio?: number
    doubleTapDelay?: number
    scrollToZoom?: boolean
  }
  controller?: {
    closeOnBackdropClick?: boolean
    closeOnEscape?: boolean
  }
  slides: Array<{ src: string; alt?: string }>
}) {
  const [activeIndex, setActiveIndex] = useState(index)
  const activeSlide = slides[activeIndex]

  useEffect(() => {
    zoom?.ref?.({ zoom: lightboxZoomLevel })
    return () => zoom?.ref?.(null)
  }, [zoom])

  return (
    <div
      data-testid="inline-photo-viewer"
      data-slide-count={slides.length}
      data-inline-width={inline?.style?.width}
      data-inline-height={inline?.style?.height}
      data-carousel-preload={carousel?.preload}
      data-carousel-image-fit={carousel?.imageFit}
      data-carousel-padding={carousel?.padding}
      data-animation-fade={animation?.fade}
      data-animation-swipe={animation?.swipe}
      data-zoom-max-pixel-ratio={zoom?.maxZoomPixelRatio}
      data-zoom-double-tap-delay={zoom?.doubleTapDelay}
      data-zoom-scroll-to-zoom={zoom?.scrollToZoom}
      data-controller-close-on-backdrop-click={controller?.closeOnBackdropClick}
      data-controller-close-on-escape={controller?.closeOnEscape}
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
const getGroupsMock = vi.mocked(getGroups)
const getPhotoMock = vi.mocked(getPhoto)
const deleteDiscoveryMock = vi.mocked(deleteDiscovery)
let lightboxZoomLevel = 1
const setActiveMapMock = vi.mocked(setActiveMap)

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
  lightboxZoomLevel = 1
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
  getGroupsMock.mockResolvedValue([])
  getPhotoMock.mockResolvedValue(new Blob(['photo']))
  deleteDiscoveryMock.mockResolvedValue(undefined)
  setActiveMapMock.mockResolvedValue({ groupId: null, name: null })
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
        {JSON.stringify(location.state)}
      </output>
      <button type="button" onClick={() => navigate(-1)}>
        Browser back
      </button>
    </>
  )
}

describe('DiscoveryDetailPage', () => {
  it('keeps the viewer background stable and uses neutral drawer surfaces', async () => {
    renderPage()

    const photoSection = await screen.findByRole('region', {
      name: 'Discovery photo',
    })
    expect(document.querySelector('main')).toHaveClass(
      'bg-[var(--sterna-viewer-background)]',
    )
    expect(photoSection).toHaveClass('bg-[var(--sterna-viewer-background)]')

    const drawer = document.querySelector('[data-slot="drawer-popup"]')
    expect(drawer).toHaveClass(
      'bg-card/92',
      'backdrop-blur-md',
      'text-foreground',
    )
    expect(screen.getByRole('button', { name: 'Alpine meadow' })).toHaveClass(
      'text-foreground',
    )
  })

  it('expands the peek drawer after an upward swipe started on the photo', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const drawer = screen.getByTestId('discovery-detail-drawer')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 240,
    })
    fireEvent.pointerMove(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')
  })

  it('keeps a mouse photo drag active when movement and release leave the photo', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const viewer = document.querySelector('main') as HTMLElement
    const drawer = screen.getByTestId('discovery-detail-drawer')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 160,
      clientY: 240,
    })
    fireEvent.pointerMove(viewer, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerUp(viewer, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 160,
      clientY: 180,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')
  })

  it('returns the expanded drawer to peek after a mouse drag leaves the photo', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const viewer = document.querySelector('main') as HTMLElement
    const drawer = screen.getByTestId('discovery-detail-drawer')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )
    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerMove(viewer, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 160,
      clientY: 240,
    })
    fireEvent.pointerUp(viewer, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 160,
      clientY: 240,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
  })

  it('keeps a touch photo swipe active when movement and release leave the photo', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const viewer = document.querySelector('main') as HTMLElement
    const drawer = screen.getByTestId('discovery-detail-drawer')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 240,
    })
    fireEvent.pointerMove(viewer, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerUp(viewer, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')
  })

  it('returns an expanded drawer to peek after a touch swipe leaves the photo', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const viewer = document.querySelector('main') as HTMLElement
    const drawer = screen.getByTestId('discovery-detail-drawer')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )
    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerMove(viewer, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 240,
    })
    fireEvent.pointerUp(viewer, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 240,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
  })

  it('returns the expanded drawer to peek after a downward photo swipe', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const drawer = screen.getByTestId('discovery-detail-drawer')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )
    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerMove(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 240,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 240,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
  })

  it('lets an expanded drawer close from a photo tap without hiding controls', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const drawer = screen.getByTestId('discovery-detail-drawer')
    const main = document.querySelector('main')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )
    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')
    expect(main).toHaveAttribute('data-controls-visible', 'true')

    vi.useFakeTimers()
    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })

    act(() => vi.advanceTimersByTime(260))
    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
    expect(main).toHaveAttribute('data-controls-visible', 'true')
    vi.useRealTimers()
  })

  it('does not treat the first tap of a YARL double tap as a viewer tap', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const drawer = screen.getByTestId('discovery-detail-drawer')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )
    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')

    vi.useFakeTimers()
    for (const pointerId of [1, 2]) {
      fireEvent.pointerDown(photo, {
        pointerId,
        pointerType: 'touch',
        clientX: 160,
        clientY: 180,
      })
      fireEvent.pointerUp(photo, {
        pointerId,
        pointerType: 'touch',
        clientX: 160,
        clientY: 180,
      })
    }
    act(() => vi.advanceTimersByTime(260))

    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')
    vi.useRealTimers()
  })

  it('keeps the top controls visible after a simple photo tap', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const main = document.querySelector('main')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    expect(main).toHaveAttribute('data-controls-visible', 'true')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 180,
    })
    expect(main).toHaveAttribute('data-controls-visible', 'true')
  })

  it('does not close the drawer when the tap starts inside its content', async () => {
    renderPage()

    const drawer = await screen.findByTestId('discovery-detail-drawer')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )
    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')

    fireEvent.click(await screen.findByText('A quiet meadow above the lake.'))

    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')
  })

  it('leaves the drawer unchanged for a horizontal photo swipe', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const drawer = screen.getByTestId('discovery-detail-drawer')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 200,
    })
    fireEvent.pointerMove(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 220,
      clientY: 200,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 220,
      clientY: 200,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
  })

  it('does not treat a vertical drag as a subsequent photo tap', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const drawer = screen.getByTestId('discovery-detail-drawer')
    const main = document.querySelector('main')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 200,
    })
    fireEvent.pointerMove(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 140,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 140,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')
    expect(main).toHaveAttribute('data-controls-visible', 'true')
  })

  it('leaves vertical pans to YARL when the photo is zoomed', async () => {
    lightboxZoomLevel = 2
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const drawer = screen.getByTestId('discovery-detail-drawer')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 200,
    })
    fireEvent.pointerMove(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 120,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 160,
      clientY: 120,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
  })

  it('leaves the drawer unchanged for a pinch gesture', async () => {
    renderPage()

    const photo = await screen.findByRole('region', { name: 'Discovery photo' })
    const drawer = screen.getByTestId('discovery-detail-drawer')

    fireEvent.pointerDown(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 140,
      clientY: 200,
    })
    fireEvent.pointerDown(photo, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 180,
      clientY: 200,
    })
    fireEvent.pointerMove(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 200,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 200,
    })
    fireEvent.pointerUp(photo, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 200,
      clientY: 200,
    })

    expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
  })

  it('uses the stable viewer background for loading and missing discovery states', async () => {
    getDiscoveryMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(await screen.findByText('Loading discovery…')).toHaveClass(
      'bg-[var(--sterna-viewer-background)]',
    )
  })

  it('uses the stable viewer background when the discovery is missing', async () => {
    getDiscoveryMock.mockResolvedValue(null as never)
    getDiscoveriesMock.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Discovery not found.')).toHaveClass(
      'bg-[var(--sterna-viewer-background)]',
    )
  })

  it('uses the photo-first layout with a peek drawer and no conventional page title', async () => {
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(320)
    const bounds = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 96 } as DOMRect)

    try {
      renderPage()

      expect(
        await screen.findByRole('heading', { name: 'Alpine meadow' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: 'Discovery' }),
      ).not.toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByTestId('discovery-detail-drawer')).toHaveAttribute(
          'data-snap-point',
          '96',
        ),
      )
      const expandedContent = screen.getByTestId(
        'discovery-detail-expanded-content',
      )
      expect(expandedContent).toHaveAttribute('aria-hidden', 'true')
      expect(expandedContent).not.toHaveClass('invisible')
    } finally {
      scrollHeight.mockRestore()
      bounds.mockRestore()
    }
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

  it('routes Escape through the viewer back navigation', async () => {
    renderPage(undefined, { withPreviousContext: true })

    await screen.findByTestId('inline-photo-viewer')
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() =>
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        '/collection',
      ),
    )
  })

  it('collapses the expanded drawer on the first Escape and navigates on the second', async () => {
    renderPage(undefined, { withPreviousContext: true })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )
    expect(screen.getByTestId('discovery-detail-drawer')).toHaveAttribute(
      'data-drawer-state',
      'expanded',
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.getByTestId('discovery-detail-drawer')).toHaveAttribute(
        'data-drawer-state',
        'peek',
      ),
    )
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/discoveries/7',
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        '/collection',
      ),
    )
  })

  it('closes the delete dialog on the first Escape and navigates on the second', async () => {
    renderPage(undefined, { withPreviousContext: true })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete discovery' }),
    )
    expect(
      screen.getByRole('alertdialog', { name: 'Delete discovery?' }),
    ).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', { name: 'Delete discovery?' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/discoveries/7',
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        '/collection',
      ),
    )
  })

  it('waits to measure the All Groups peek controls until the drawer is rendered', async () => {
    let resolveGroups!: (groups: []) => void
    getGroupsMock.mockReturnValue(
      new Promise((resolve) => {
        resolveGroups = resolve
      }),
    )
    const bounds = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 123 } as DOMRect)

    try {
      renderPage(
        { galleryIds: [7], gallerySource: 'all-groups' },
        { initialPath: '/discoveries/7' },
      )

      expect(await screen.findByText('Loading discovery…')).toBeVisible()
      expect(
        screen.queryByTestId('discovery-detail-drawer'),
      ).not.toBeInTheDocument()
      expect(bounds).not.toHaveBeenCalled()

      await act(async () => resolveGroups([]))
      const drawer = await screen.findByTestId('discovery-detail-drawer')
      await waitFor(() =>
        expect(drawer).toHaveAttribute('data-peek-snap-point', '123'),
      )
    } finally {
      bounds.mockRestore()
    }
  })

  it('groups the contextual discovery details separately from its narrative', async () => {
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(320)
    const bounds = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 56 } as DOMRect)

    try {
      renderPage()

      const drawer = await screen.findByTestId('discovery-detail-drawer')
      await waitFor(() =>
        expect(drawer).toHaveAttribute('data-drawer-state', 'peek'),
      )
      const titleToggle = screen.getByRole('button', {
        name: 'Alpine meadow',
      })
      expect(titleToggle).not.toBeDisabled()
      fireEvent.click(titleToggle)

      const metadata = await screen.findByRole('group', {
        name: 'Discovery metadata',
      })
      expect(metadata.firstElementChild).toHaveTextContent('Landscape')
      expect(metadata.firstElementChild).toHaveClass(
        'rounded-full',
        'bg-[#DBEAFE]',
      )
      expect(metadata.firstElementChild).toHaveStyle({
        borderColor: '#2563EB',
      })
      expect(metadata).toHaveTextContent('Added byExplorer')
      expect(metadata).toHaveTextContent('Datetoday')
      expect(metadata).toHaveTextContent('Personal map')
      expect(metadata.querySelectorAll('.rounded-xl')).toHaveLength(4)
      expect(metadata).not.toHaveTextContent('A quiet meadow above the lake.')
      expect(screen.getByText('A quiet meadow above the lake.')).toBeVisible()
      expect(screen.getByRole('heading', { name: 'Description' })).toBeVisible()
    } finally {
      scrollHeight.mockRestore()
      bounds.mockRestore()
    }
  })

  it('keeps direct edit and delete actions accessible from the compact viewer', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Alpine meadow' }),
    ).toBeInTheDocument()
    const edit = screen.getByRole('link', { name: 'Edit discovery' })
    expect(edit).toHaveAttribute('href', '/discoveries/7/edit')
    expect(edit.querySelector('svg')).toHaveClass('size-5')
    expect(
      screen.getByRole('button', { name: 'Delete discovery' }),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull()
  })

  it('keeps the photo in the unified inline viewer without opening a dialog', async () => {
    renderPage()

    const photo = await screen.findByRole('img', { name: 'Alpine meadow' })
    const photoRegion = screen.getByRole('region', {
      name: 'Discovery photo',
    })
    expect(getPhotoMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('inline-photo-viewer')).toBeInTheDocument()
    expect(photoRegion).toHaveClass('bg-[var(--sterna-viewer-background)]')
    expect(photoRegion.closest('main')).toHaveClass(
      'bg-[var(--sterna-viewer-background)]',
    )

    fireEvent.click(photo)

    expect(
      screen.queryByRole('dialog', { name: 'Photo viewer' }),
    ).not.toBeInTheDocument()
    expect(getPhotoMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the viewer controls visible when the photo background is pressed', async () => {
    renderPage()

    const photo = await screen.findByRole('img', { name: 'Alpine meadow' })
    const screenRoot = photo.closest('main')
    expect(screenRoot).toHaveAttribute('data-controls-visible', 'true')
    expect(screen.getByRole('button', { name: 'Go back' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Edit discovery' })).toBeVisible()
    expect(screen.getByTestId('discovery-detail-drawer')).toBeInTheDocument()

    fireEvent.click(photo)

    expect(screenRoot).toHaveAttribute('data-controls-visible', 'true')
    expect(screen.getByRole('button', { name: 'Go back' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Edit discovery' })).toBeVisible()
    expect(screen.getByTestId('discovery-detail-drawer')).toBeInTheDocument()
  })

  it('gives Inline a measurable full-size container', async () => {
    renderPage()

    const viewer = await screen.findByTestId('inline-photo-viewer')

    expect(viewer).toHaveAttribute('data-inline-width', '100%')
    expect(viewer).toHaveAttribute('data-inline-height', '100%')
    expect(viewer).toHaveAttribute('data-carousel-padding', '0')
    expect(viewer).toHaveClass('absolute', 'inset-0')
  })

  it('preloads the adjacent slide without overriding YARL slide timing', async () => {
    renderPage()

    const viewer = await screen.findByTestId('inline-photo-viewer')

    expect(viewer).toHaveAttribute('data-carousel-preload', '1')
    expect(viewer).toHaveAttribute('data-carousel-image-fit', 'contain')
    expect(viewer).toHaveAttribute('data-carousel-padding', '0')
    expect(viewer).not.toHaveAttribute('data-animation-fade')
    expect(viewer).not.toHaveAttribute('data-animation-swipe')
    expect(viewer).toHaveAttribute('data-zoom-max-pixel-ratio', '3')
    expect(viewer).toHaveAttribute('data-zoom-double-tap-delay', '250')
    expect(viewer).toHaveAttribute('data-zoom-scroll-to-zoom', 'true')
    expect(viewer).toHaveAttribute(
      'data-controller-close-on-backdrop-click',
      'false',
    )
    expect(viewer).toHaveAttribute('data-controller-close-on-escape', 'false')
  })

  it('keeps gallery navigation without showing a photo counter', async () => {
    const secondDiscovery = {
      ...discovery,
      id: 8,
      name: 'Lac de Bretaye',
      imageObjectKey: 'photos/lac.jpg',
    }
    getDiscoveriesMock.mockResolvedValue([discovery, secondDiscovery])

    renderPage({
      returnTo: '/collection',
      galleryIds: [7, 8],
      gallerySource: 'personal',
    })

    await screen.findByTestId('inline-photo-viewer')
    expect(screen.queryByLabelText('Photo 1 of 2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go back' })).toHaveClass(
      'bg-white',
      'text-black',
    )

    fireEvent.click(screen.getByTestId('lightbox-next'))

    expect(
      await screen.findByRole('button', { name: 'Lac de Bretaye' }),
    ).toBeVisible()
    expect(screen.queryByLabelText('Photo 2 of 2')).not.toBeInTheDocument()
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
    expect(screen.getByText('Added by')).toBeVisible()
    expect(screen.getByText('Friend')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'More actions' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the title visible while toggling between compact and expanded states', async () => {
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(320)
    const bounds = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 56 } as DOMRect)

    try {
      renderPage()

      const drawer = await screen.findByTestId('discovery-detail-drawer')
      expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
      expect(drawer).toHaveAttribute('data-snap-points', '72,0.55')
      await waitFor(() =>
        expect(drawer).toHaveAttribute('data-snap-points', '56,0.55'),
      )
      const title = screen.getByRole('button', { name: 'Alpine meadow' })
      expect(title).toBeVisible()
      expect(title).toHaveProperty('tabIndex', 0)

      const handle = screen.getByRole('button', { name: 'Expand details' })
      expect(handle).toHaveAttribute('data-testid', 'drawer-handle')
      expect(handle).toHaveClass('h-6', 'py-0', 'items-center')
      fireEvent.click(handle)
      expect(drawer).toHaveAttribute('data-drawer-state', 'expanded')
      expect(
        await screen.findByText('A quiet meadow above the lake.'),
      ).toBeVisible()
      expect(title).toBeVisible()
      expect(title).toHaveProperty('tabIndex', 0)

      fireEvent.click(screen.getByRole('button', { name: 'Collapse details' }))
      expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
      expect(title).toBeVisible()
    } finally {
      scrollHeight.mockRestore()
      bounds.mockRestore()
    }
  })

  it('keeps a stable 55dvh popup with semantic snap points and measured peek', async () => {
    const bounds = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 112 } as DOMRect)

    try {
      renderPage()

      const drawer = await screen.findByTestId('discovery-detail-drawer')
      await waitFor(() =>
        expect(drawer).toHaveAttribute('data-peek-snap-point', '112'),
      )
      expect(drawer).toHaveAttribute('data-drawer-state', 'peek')
      expect(drawer).toHaveAttribute('data-snap-points', '112,0.55')
      expect(drawer).toHaveAttribute('data-snap-point', '112')

      const popup = document.querySelector('[data-slot="drawer-popup"]')
      expect(popup).not.toHaveClass('!h-auto', 'relative')
      expect(popup).toHaveClass(
        '!h-[55dvh]',
        '!max-h-[55dvh]',
        'touch-none',
        'will-change-transform',
        'transition-[transform,box-shadow]',
        'duration-[450ms]',
        'data-swiping:duration-0',
      )
      expect(popup).toHaveClass(
        '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
      )

      const title = screen.getByRole('button', { name: 'Alpine meadow' })
      expect(title).toHaveClass('text-center', 'font-sans', '!font-bold')
      expect(title).not.toHaveClass('text-left')

      const details = screen.getByTestId('discovery-detail-expanded-content')
      expect(details).not.toHaveClass('invisible', 'absolute', 'h-0')
      expect(details).not.toHaveAttribute('data-base-ui-swipe-ignore')
      expect(details).toHaveClass(
        'touch-auto',
        'flex-1',
        'min-h-0',
        'overflow-y-auto',
        'overscroll-contain',
      )
    } finally {
      bounds.mockRestore()
    }
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

    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete discovery' }),
    )
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
      screen.getByRole('button', { name: 'Delete discovery' }),
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
    getGroupsMock.mockResolvedValue([
      {
        id: '12',
        name: 'Group 12',
        description: null,
        role: 'member',
        isActive: true,
        memberCount: 1,
        discoveryCount: 1,
      },
      {
        id: '27',
        name: 'Group 27',
        description: null,
        role: 'member',
        isActive: true,
        memberCount: 1,
        discoveryCount: 1,
      },
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

  it('uses an accessible All Groups membership when the primary group is not accessible', async () => {
    const firstGroupDiscovery = {
      ...discovery,
      id: 7,
      name: 'Group A discovery',
      groupId: 'A',
      groupIds: ['A', 'B'],
      personal: false,
    }
    const secondGroupDiscovery = {
      ...discovery,
      id: 8,
      name: 'Group B discovery',
      groupId: 'A',
      groupIds: ['A', 'B'],
      personal: false,
    }
    getAllGroupDiscoveriesMock.mockResolvedValue([
      firstGroupDiscovery,
      secondGroupDiscovery,
    ])
    getGroupsMock.mockResolvedValue([
      {
        id: 'B',
        name: 'Group B',
        description: null,
        role: 'member',
        isActive: true,
        memberCount: 1,
        discoveryCount: 1,
      },
    ])

    renderPage(
      {
        returnTo: '/collection',
        galleryIds: [7, 8],
        gallerySource: 'all-groups',
      },
      { initialPath: '/discoveries/7?group=A' },
    )

    fireEvent.click(await screen.findByTestId('lightbox-next'))

    expect(
      await screen.findByRole('button', { name: 'Group B discovery' }),
    ).toBeVisible()
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '/discoveries/8?group=B',
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

  it('opens the discovery on its map from the expanded details', async () => {
    renderPage()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Alpine meadow' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show on map' }))

    await waitFor(() =>
      expect(setActiveMapMock).toHaveBeenCalledWith({
        accessToken: 'test-token',
        groupId: null,
      }),
    )
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '"coordinates":[6.6,46.7],"zoom":16,"label":"Alpine meadow"',
    )
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
      ).toHaveClass('bg-primary/85')

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
