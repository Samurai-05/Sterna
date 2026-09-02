import { ArrowLeft, Check, MoreHorizontal, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import Lightbox, { type SlideImage } from 'yet-another-react-lightbox'
import Inline from 'yet-another-react-lightbox/plugins/inline'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import { DiscoveryDetailsContent } from '@/components/DiscoveryDetailsContent'
import { ALL_GROUPS } from '@/components/GalleryGroupFilter'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerSwipeHandle,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog'
import {
  deleteDiscovery,
  getAllGroupDiscoveries,
  getDiscoveries,
  getDiscovery,
  getGroupDiscoveries,
} from '@/lib/api'
import { useDiscoveryPhotoSources } from '@/hooks/useDiscoveryPhotoSource'
import { discoveryPath } from '@/lib/discovery-path'
import { getDiscoveryRouteState } from '@/lib/route-state'
import { imageUrl, type Discovery } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'
import { useMeasuredDrawerSnapPoints } from '@/hooks/useMeasuredDrawerSnapPoint'

const MINIMIZED_SNAP_POINT = '1.75rem'
const EMPTY_GALLERY: Discovery[] = []
const UNLOADED_PHOTO_SOURCE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

type GalleryPhotoSlide = SlideImage & {
  discoveryId: number
  state: 'idle' | 'loading' | 'success' | 'error'
}

type DiscoveryDetailPageProps = {
  presentation?: 'page' | 'overlay'
}

export function DiscoveryDetailPage({
  presentation = 'page',
}: DiscoveryDetailPageProps) {
  const { discoveryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const session = loadSession()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('group')
  const routeState = getDiscoveryRouteState(location.state)
  const gallerySource =
    routeState.gallerySource ?? (groupId ? 'group' : 'personal')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const [showCreatedFeedback, setShowCreatedFeedback] = useState(
    () => getDiscoveryRouteState(location.state).justCreated === true,
  )
  const createdFeedbackConsumedRef = useRef(false)
  const [snapPoint, setSnapPoint] = useState<string | number>(
    MINIMIZED_SNAP_POINT,
  )
  const [deletedDiscoveryIds, setDeletedDiscoveryIds] = useState<Set<number>>(
    () => new Set(),
  )
  const actionMenuRef = useRef<HTMLDivElement>(null)
  const actionTriggerRef = useRef<HTMLButtonElement>(null)
  const drawerControlsRef = useRef<HTMLDivElement>(null)
  const expandedContentRef = useRef<HTMLDivElement>(null)
  const measuredDrawerSnapPointsRef = useRef<{
    peek: number
    expanded: number | null
  } | null>(null)
  const routeReturnTo = routeState.returnTo
  const backgroundLocation = routeState.backgroundLocation
  const justCreated = routeState.justCreated
  const returnTo = routeReturnTo ?? '/collection'

  const handleBack = () => {
    if (routeState.backgroundLocation) {
      navigate(-1)
      return
    }

    navigate(returnTo, { replace: true })
  }

  useEffect(() => {
    if (!justCreated || createdFeedbackConsumedRef.current) return

    createdFeedbackConsumedRef.current = true
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      {
        replace: true,
        state: {
          returnTo: routeReturnTo,
          backgroundLocation,
        },
      },
    )
  }, [
    backgroundLocation,
    justCreated,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    routeReturnTo,
  ])

  useEffect(() => {
    if (!showCreatedFeedback) return

    const timeoutId = window.setTimeout(() => {
      setShowCreatedFeedback(false)
    }, 1_200)

    return () => window.clearTimeout(timeoutId)
  }, [showCreatedFeedback])

  const personalQuery = useQuery({
    queryKey: ['discovery', session?.user.id, discoveryId],
    queryFn: () => getDiscovery(session!.accessToken, discoveryId!),
    enabled: Boolean(
      session && discoveryId && gallerySource === 'personal' && !groupId,
    ),
  })

  const galleryQuery = useQuery({
    queryKey:
      gallerySource === 'personal'
        ? ['discoveries', session?.user.id]
        : [
            'group-discoveries',
            session?.user.id,
            gallerySource === 'all-groups' ? ALL_GROUPS : groupId,
          ],
    queryFn: () => {
      if (gallerySource === 'all-groups') {
        return getAllGroupDiscoveries(session!.accessToken)
      }
      if (gallerySource === 'group' && groupId) {
        return getGroupDiscoveries(session!.accessToken, groupId)
      }
      return getDiscoveries(session!.accessToken)
    },
    enabled: Boolean(
      session && discoveryId && (gallerySource !== 'group' || Boolean(groupId)),
    ),
  })

  const routeGalleryIds = routeState.galleryIds
  const detailDiscovery =
    personalQuery.data ??
    galleryQuery.data?.find((item) => String(item.id) === discoveryId)
  const galleryDiscoveries = useMemo(() => {
    const sourceItems = galleryQuery.data ?? EMPTY_GALLERY
    const orderedItems = routeGalleryIds
      ? routeGalleryIds
          .map((id) => sourceItems.find((item) => item.id === id))
          .filter((item): item is Discovery => Boolean(item))
      : sourceItems
    const withoutDeleted = orderedItems.filter(
      (item) => !deletedDiscoveryIds.has(item.id),
    )

    if (
      detailDiscovery &&
      !deletedDiscoveryIds.has(detailDiscovery.id) &&
      !withoutDeleted.some((item) => item.id === detailDiscovery.id)
    ) {
      return [...withoutDeleted, detailDiscovery]
    }

    return withoutDeleted.length > 0
      ? withoutDeleted
      : detailDiscovery && !deletedDiscoveryIds.has(detailDiscovery.id)
        ? [detailDiscovery]
        : EMPTY_GALLERY
  }, [deletedDiscoveryIds, detailDiscovery, galleryQuery.data, routeGalleryIds])
  const routeIndex = Math.max(
    0,
    galleryDiscoveries.findIndex((item) => String(item.id) === discoveryId),
  )

  const discovery = galleryDiscoveries[routeIndex] ?? detailDiscovery
  const isLoading =
    !detailDiscovery && (personalQuery.isLoading || galleryQuery.isLoading)
  const activeDiscoveryIndex = discovery
    ? Math.max(
        0,
        galleryDiscoveries.findIndex((item) => item.id === discovery.id),
      )
    : 0

  const navigateToDiscovery = useCallback(
    (nextDiscovery: Discovery) => {
      navigate(
        discoveryPath(
          nextDiscovery.id,
          resolveDiscoveryGroupId(nextDiscovery, gallerySource, groupId),
        ),
        {
          replace: true,
          state: {
            returnTo: routeReturnTo,
            backgroundLocation,
            galleryIds: routeGalleryIds,
            gallerySource,
          },
        },
      )
    },
    [
      backgroundLocation,
      gallerySource,
      groupId,
      navigate,
      routeGalleryIds,
      routeReturnTo,
    ],
  )
  const navigateToSlide = useCallback(
    (nextIndex: number) => {
      const nextDiscovery = galleryDiscoveries[nextIndex]
      if (nextDiscovery) navigateToDiscovery(nextDiscovery)
    },
    [galleryDiscoveries, navigateToDiscovery],
  )

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteDiscovery(session!.accessToken, String(discovery!.id)),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ['discovery', session?.user.id, String(discovery!.id)],
      })
      queryClient.invalidateQueries({
        queryKey: ['discoveries', session?.user.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['group-discoveries', session?.user.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['pois', session?.user.id],
      })
      if (galleryDiscoveries.length <= 1) {
        handleBack()
        return
      }

      const deletedIndex = activeDiscoveryIndex
      const remainingDiscoveries = galleryDiscoveries.filter(
        (item) => item.id !== discovery!.id,
      )
      const adjacentDiscovery =
        remainingDiscoveries[
          Math.min(deletedIndex, remainingDiscoveries.length - 1)
        ]
      setDeletedDiscoveryIds((current) => {
        const next = new Set(current)
        next.add(discovery!.id)
        return next
      })
      if (adjacentDiscovery) navigateToDiscovery(adjacentDiscovery)
    },
  })

  const pageClassName =
    'sterna-discovery-screen fixed inset-0 z-40 !p-0 overflow-hidden bg-stone-950'

  const handleDrawerSnapPointsChange = useCallback(
    (nextSnapPoints: { peek: number; expanded: number | null }) => {
      const previousSnapPoints = measuredDrawerSnapPointsRef.current
      measuredDrawerSnapPointsRef.current = nextSnapPoints
      setSnapPoint((currentSnapPoint) => {
        if (
          previousSnapPoints === null ||
          currentSnapPoint === previousSnapPoints.peek
        ) {
          return nextSnapPoints.peek
        }
        if (
          previousSnapPoints.expanded !== null &&
          currentSnapPoint === previousSnapPoints.expanded
        ) {
          return nextSnapPoints.expanded ?? nextSnapPoints.peek
        }
        return currentSnapPoint
      })
    },
    [],
  )
  const measuredDrawerSnapPoints = useMeasuredDrawerSnapPoints({
    controlsRef: drawerControlsRef,
    contentRef: expandedContentRef,
    enabled: Boolean(discovery),
    measurementKey: discovery?.id ?? null,
    onSnapPointsChange: handleDrawerSnapPointsChange,
  })
  const peekSnapPoint = measuredDrawerSnapPoints?.peek ?? MINIMIZED_SNAP_POINT
  const expandedSnapPoint = measuredDrawerSnapPoints?.expanded ?? null
  const isMinimized = snapPoint === MINIMIZED_SNAP_POINT
  const isExpanded =
    expandedSnapPoint !== null && snapPoint === expandedSnapPoint
  const drawerSnapPoints =
    expandedSnapPoint === null
      ? [MINIMIZED_SNAP_POINT, peekSnapPoint]
      : [MINIMIZED_SNAP_POINT, peekSnapPoint, expandedSnapPoint]

  useEffect(() => {
    if (!isActionMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setIsActionMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsActionMenuOpen(false)
      actionTriggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    actionMenuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus()

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActionMenuOpen])

  if (isLoading) {
    return (
      <main className={pageClassName}>
        <div className="absolute left-[max(1rem,var(--sterna-safe-area-left))] top-[max(1rem,var(--sterna-safe-area-top))] z-[60]">
          <FloatingBackButton onClick={handleBack} />
        </div>
        <div className="flex size-full items-center justify-center bg-stone-950 text-sm text-white/70">
          Loading discovery…
        </div>
      </main>
    )
  }

  if (!discovery) {
    return (
      <main className={pageClassName}>
        <div className="absolute left-[max(1rem,var(--sterna-safe-area-left))] top-[max(1rem,var(--sterna-safe-area-top))] z-[60]">
          <FloatingBackButton onClick={handleBack} />
        </div>
        <div className="flex size-full items-center justify-center bg-stone-950 px-5 text-center text-sm text-white/70">
          Discovery not found.
        </div>
      </main>
    )
  }

  const discoveryGroupId = resolveDiscoveryGroupId(
    discovery,
    gallerySource,
    groupId,
  )
  const isAuthor =
    discovery.userId === undefined || discovery.userId === session?.user.id

  return (
    <main className={pageClassName} data-presentation={presentation}>
      <section
        className="absolute inset-0 h-full w-full bg-stone-950"
        aria-label="Discovery photo"
      >
        <DiscoveryPhotoZoom
          discoveries={galleryDiscoveries}
          activeIndex={activeDiscoveryIndex}
          onView={navigateToSlide}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent"
          aria-hidden="true"
        />
      </section>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-between px-[max(1rem,var(--sterna-safe-area-left))] pr-[max(1rem,var(--sterna-safe-area-right))] pt-[max(1rem,var(--sterna-safe-area-top))]">
        <FloatingBackButton onClick={handleBack} />
        {galleryDiscoveries.length > 1 && (
          <output
            aria-live="polite"
            aria-label={`Photo ${activeDiscoveryIndex + 1} of ${galleryDiscoveries.length}`}
            className="pointer-events-none absolute left-1/2 top-[max(1rem,var(--sterna-safe-area-top))] -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 font-sans text-xs font-medium tabular-nums text-white shadow-lg backdrop-blur-md"
          >
            {activeDiscoveryIndex + 1} / {galleryDiscoveries.length}
          </output>
        )}
        {isAuthor && (
          <div ref={actionMenuRef} className="pointer-events-auto relative">
            <Button
              ref={actionTriggerRef}
              type="button"
              variant="ghost"
              size="icon-lg"
              className="rounded-full border border-white/20 bg-black/35 text-white shadow-lg backdrop-blur-sm hover:bg-black/55 hover:text-white"
              aria-label="More actions"
              aria-controls="discovery-actions-menu"
              aria-haspopup="menu"
              aria-expanded={isActionMenuOpen}
              onClick={() => setIsActionMenuOpen((open) => !open)}
            >
              <MoreHorizontal className="size-5" />
            </Button>
            {isActionMenuOpen && (
              <div
                id="discovery-actions-menu"
                role="menu"
                className="absolute right-0 top-12 z-10 min-w-44 overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-foreground shadow-2xl"
              >
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Link
                    role="menuitem"
                    to={`/discoveries/${discovery.id}/edit`}
                    state={{ returnTo }}
                  >
                    Edit discovery
                  </Link>
                </Button>
                <Button
                  type="button"
                  role="menuitem"
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => {
                    setIsActionMenuOpen(false)
                    setIsDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 />
                  Delete discovery
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreatedFeedback && (
        <div
          role="status"
          aria-label="Discovery added"
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-[max(5rem,var(--sterna-safe-area-top))] z-[70] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-2 duration-300"
        >
          <Check className="size-4 text-green-200" aria-hidden="true" />
          Discovery added
        </div>
      )}

      <div
        data-testid="discovery-detail-drawer"
        data-drawer-state={
          isMinimized ? 'minimized' : isExpanded ? 'expanded' : 'peek'
        }
        data-snap-points={drawerSnapPoints.join(',')}
        data-peek-snap-point={measuredDrawerSnapPoints?.peek ?? 'null'}
        data-expanded-snap-point={expandedSnapPoint}
        data-snap-point={snapPoint}
        className="relative z-50"
      >
        <Drawer
          open
          onOpenChange={() => undefined}
          modal={false}
          disablePointerDismissal
          snapPoints={drawerSnapPoints}
          snapPoint={snapPoint}
          onSnapPointChange={(nextSnapPoint) => {
            if (nextSnapPoint !== null) setSnapPoint(nextSnapPoint)
          }}
          snapToSequentialPoints
        >
          <DrawerContent
            className={`[--drawer-content-max-height:100dvh] border border-white/15 shadow-[0_-12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-[background-color,color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${isExpanded ? 'bg-card/95 text-foreground shadow-[0_-12px_40px_rgba(0,0,0,0.2)]' : isMinimized ? 'bg-black/20 text-white' : 'bg-black/50 text-white'}`}
          >
            <div
              ref={drawerControlsRef}
              className="relative z-10 rounded-t-[inherit] border-t border-white/15"
            >
              <DrawerSwipeHandle
                data-testid="drawer-handle"
                aria-label={isMinimized ? 'Expand details' : 'Collapse details'}
                onClick={() => {
                  setSnapPoint(
                    isExpanded
                      ? peekSnapPoint
                      : isMinimized
                        ? peekSnapPoint
                        : MINIMIZED_SNAP_POINT,
                  )
                }}
                className={isExpanded ? '' : '[&>span]:bg-white/70'}
              />
              <DrawerHeader className="shrink-0 items-center px-5 pt-0 pb-[max(0.75rem,var(--sterna-safe-area-bottom))] text-center">
                <DrawerTitle render={<h1 className="sr-only" />}>
                  {discovery.name}
                </DrawerTitle>
                <button
                  type="button"
                  disabled={expandedSnapPoint === null}
                  className={`min-h-11 w-full truncate rounded-xl px-0 text-center font-display text-xl font-semibold leading-7 outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40 ${isExpanded ? 'text-foreground' : 'text-white'}`}
                  aria-controls="discovery-detail-expanded-content"
                  aria-expanded={isExpanded}
                  onClick={() => {
                    if (expandedSnapPoint === null) return
                    setSnapPoint(isExpanded ? peekSnapPoint : expandedSnapPoint)
                  }}
                >
                  {discovery.name}
                </button>
              </DrawerHeader>
            </div>

            <div
              ref={expandedContentRef}
              id="discovery-detail-expanded-content"
              data-testid="discovery-detail-expanded-content"
              data-base-ui-swipe-ignore=""
              aria-hidden={!isExpanded}
              className="min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,var(--sterna-safe-area-bottom))]"
            >
              <DiscoveryDetailsContent
                discovery={discovery}
                groupId={discoveryGroupId}
                isAuthor={isAuthor}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <ConfirmActionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete discovery?"
        description="Delete this discovery permanently?"
        confirmLabel="Delete discovery"
        confirmDisabled={deleteMutation.isPending}
        onConfirm={() => {
          setIsDeleteDialogOpen(false)
          deleteMutation.mutate()
        }}
      />
      {deleteMutation.isError && (
        <p
          role="alert"
          className="absolute bottom-28 left-5 z-[60] rounded-xl bg-card px-3 py-2 text-sm text-destructive shadow-lg"
        >
          Unable to delete discovery.
        </p>
      )}
    </main>
  )
}

function DiscoveryPhotoZoom({
  discoveries,
  activeIndex,
  onView,
}: {
  discoveries: Discovery[]
  activeIndex: number
  onView: (index: number) => void
}) {
  const { sources, states, onSourceError } = useDiscoveryPhotoSources({
    discoveries,
    activeIndex,
    width: 1200,
    variant: 'detail',
  })
  const activeDiscovery = discoveries[activeIndex]
  const slides = useMemo(
    () =>
      discoveries.map((discovery): GalleryPhotoSlide => ({
        src: discovery.imageObjectKey
          ? (sources[discovery.id] ?? UNLOADED_PHOTO_SOURCE)
          : imageUrl(discovery.imageId, 1200),
        alt: discovery.name,
        discoveryId: discovery.id,
        state: discovery.imageObjectKey
          ? (states[discovery.id] ?? 'idle')
          : 'success',
      })),
    [discoveries, sources, states],
  )

  if (!activeDiscovery) return null

  return (
    <div
      className="absolute inset-0 z-0 h-full w-full"
      onErrorCapture={(event) => {
        const source = (event.target as HTMLImageElement).src
        const failedSlide = slides.find((slide) => slide.src === source)
        if (failedSlide) onSourceError(failedSlide.discoveryId)
      }}
    >
      <Lightbox
        open
        close={() => undefined}
        index={activeIndex}
        slides={slides}
        plugins={[Inline, Zoom]}
        inline={{
          className: 'absolute inset-0 z-0 h-full w-full',
          style: { width: '100%', height: '100%' },
          'aria-label': `${activeDiscovery.name} photo`,
        }}
        on={{ view: ({ index }) => onView(index) }}
        className="!bg-transparent"
        toolbar={{ buttons: [] }}
        render={{
          slide: ({ slide }) => {
            const photoSlide = slide as GalleryPhotoSlide
            if (photoSlide.state === 'success') return undefined

            return (
              <GalleryPhotoState
                state={photoSlide.state}
                name={photoSlide.alt ?? 'Discovery'}
              />
            )
          },
          buttonPrev: () => null,
          buttonNext: () => null,
          buttonClose: () => null,
          buttonZoom: () => null,
        }}
        carousel={{
          finite: true,
          imageFit: 'contain',
          preload: 1,
        }}
        zoom={{
          maxZoomPixelRatio: 3,
          doubleTapDelay: 250,
          scrollToZoom: true,
        }}
        styles={{
          root: { backgroundColor: 'transparent' },
          container: { backgroundColor: 'transparent' },
        }}
        controller={{ closeOnBackdropClick: false }}
      />
    </div>
  )
}

function GalleryPhotoState({
  state,
  name,
}: {
  state: GalleryPhotoSlide['state']
  name: string
}) {
  const unavailable = state === 'error'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!unavailable}
      aria-label={unavailable ? 'Photo unavailable' : 'Loading discovery photo'}
      className="flex size-full items-center justify-center bg-stone-950 px-6 text-center text-sm text-white/70"
    >
      {unavailable ? `Photo unavailable for ${name}.` : 'Loading photo…'}
    </div>
  )
}

function resolveDiscoveryGroupId(
  discovery: Discovery,
  gallerySource: 'personal' | 'group' | 'all-groups',
  currentGroupId: string | null,
) {
  if (gallerySource === 'personal') return null
  if (gallerySource === 'group') return currentGroupId

  return discovery.groupId ?? discovery.groupIds?.[0] ?? null
}

function FloatingBackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="pointer-events-auto rounded-full border border-white/20 bg-black/35 text-white shadow-lg backdrop-blur-sm hover:bg-black/55 hover:text-white"
      onClick={onClick}
      aria-label="Go back"
    >
      <ArrowLeft className="size-5" />
    </Button>
  )
}
