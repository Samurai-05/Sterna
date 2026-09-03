import { ArrowLeft, Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
  getGroups,
  getGroupDiscoveries,
} from '@/lib/api'
import { useDiscoveryPhotoSources } from '@/hooks/useDiscoveryPhotoSource'
import { discoveryPath } from '@/lib/discovery-path'
import {
  handleDiscoveryDrawerOpenChange,
  handleViewerBackRequest as handleViewerBackRequestState,
} from '@/lib/discovery-drawer'
import { resolveDiscoveryGroupId } from '@/lib/discovery-group'
import { getDiscoveryRouteState } from '@/lib/route-state'
import { imageUrl, type Discovery } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'
import { useMeasuredDrawerPeekSnapPoint } from '@/hooks/useMeasuredDrawerPeekSnapPoint'

const MINIMIZED_SNAP_POINT = 36
const PEEK_FALLBACK_SNAP_POINT = 96
const EXPANDED_SNAP_POINT = 0.55
const EMPTY_GALLERY: Discovery[] = []
const UNLOADED_PHOTO_SOURCE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

function isPhotoGestureExcludedTarget(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : null
  return Boolean(
    element?.closest(
      'button, a, [role="menu"], [data-slot^="drawer"], [data-viewer-control="true"]',
    ),
  )
}

type GalleryPhotoSlide = SlideImage & {
  discoveryId: number
  state: 'idle' | 'loading' | 'success' | 'error'
}

type DiscoveryDetailPageProps = {
  presentation?: 'page' | 'overlay'
}

type DiscoveryDrawerState = 'minimized' | 'peek' | 'expanded'

type PhotoGestureAxis = 'vertical' | 'horizontal'

type PhotoGesture = {
  activePointerIds: Set<number>
  primaryPointerId: number
  startX: number
  startY: number
  axis: PhotoGestureAxis | null
  moved: boolean
  multiTouch: boolean
  zoomedAtStart: boolean
}

const PHOTO_GESTURE_THRESHOLD = 12
const DRAWER_SWIPE_DISTANCE = 44

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
  const [drawerState, setDrawerState] = useState<DiscoveryDrawerState>('peek')
  const controlsVisible = true
  const [deletedDiscoveryIds, setDeletedDiscoveryIds] = useState<Set<number>>(
    () => new Set(),
  )
  const drawerStateRef = useRef(drawerState)
  const actionMenuRef = useRef<HTMLDivElement>(null)
  const actionTriggerRef = useRef<HTMLButtonElement>(null)
  const drawerControlsRef = useRef<HTMLDivElement>(null)
  const photoGestureRef = useRef<PhotoGesture | null>(null)
  const zoomRef = useRef<{ zoom: number } | null>(null)
  const routeReturnTo = routeState.returnTo
  const backgroundLocation = routeState.backgroundLocation
  const justCreated = routeState.justCreated
  const returnTo = routeReturnTo ?? '/collection'

  useEffect(() => {
    drawerStateRef.current = drawerState
  }, [drawerState])

  const handleBack = () => {
    if (routeState.backgroundLocation) {
      navigate(-1)
      return
    }

    navigate(returnTo, { replace: true })
  }

  const handleViewerBackRequest = () =>
    handleViewerBackRequestState({
      isDeleteDialogOpen,
      isActionMenuOpen,
      closeDeleteDialog: () => setIsDeleteDialogOpen(false),
      closeActionMenu: () => setIsActionMenuOpen(false),
      restoreActionMenuFocus: () =>
        window.setTimeout(() => actionTriggerRef.current?.focus(), 0),
      isDrawerExpanded: drawerState === 'expanded',
      closeDrawer: () => setDrawerState('peek'),
      handleBack,
    })

  const handlePhotoPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const currentGesture = photoGestureRef.current
    if (currentGesture) {
      currentGesture.activePointerIds.add(event.pointerId)
      currentGesture.multiTouch = true
      return
    }

    const target = event.target instanceof Element ? event.target : null
    if (
      !target?.closest('[data-photo-gesture-surface="true"]') ||
      isPhotoGestureExcludedTarget(event.target)
    ) {
      return
    }

    photoGestureRef.current = {
      activePointerIds: new Set([event.pointerId]),
      primaryPointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      moved: false,
      multiTouch: false,
      zoomedAtStart: (zoomRef.current?.zoom ?? 1) > 1,
    }
  }

  useEffect(() => {
    const handlePhotoPointerMove = (event: PointerEvent) => {
      const gesture = photoGestureRef.current
      if (!gesture || gesture.primaryPointerId !== event.pointerId) return

      if (gesture.activePointerIds.size > 1 || gesture.multiTouch) return
      if (gesture.zoomedAtStart || (zoomRef.current?.zoom ?? 1) > 1) {
        gesture.moved = true
        return
      }

      const deltaX = event.clientX - gesture.startX
      const deltaY = event.clientY - gesture.startY
      const distance = Math.hypot(deltaX, deltaY)
      if (distance < PHOTO_GESTURE_THRESHOLD) return

      gesture.moved = true
      if (!gesture.axis) {
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.25) {
          gesture.axis = 'vertical'
        } else if (Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
          gesture.axis = 'horizontal'
        } else {
          return
        }
      }

      if (gesture.axis === 'vertical') {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const handlePhotoPointerUp = (event: PointerEvent) => {
      const gesture = photoGestureRef.current
      if (!gesture) return

      const isPrimaryPointer = gesture.primaryPointerId === event.pointerId
      gesture.activePointerIds.delete(event.pointerId)
      if (gesture.activePointerIds.size > 0) return

      photoGestureRef.current = null
      if (!isPrimaryPointer || gesture.multiTouch || gesture.zoomedAtStart) {
        return
      }

      if (gesture.axis === 'vertical') {
        const deltaY = event.clientY - gesture.startY
        if (
          drawerStateRef.current === 'peek' &&
          deltaY <= -DRAWER_SWIPE_DISTANCE
        ) {
          setDrawerState('expanded')
        } else if (
          drawerStateRef.current === 'expanded' &&
          deltaY >= DRAWER_SWIPE_DISTANCE
        ) {
          setDrawerState('peek')
        }
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (gesture.axis === 'horizontal' || gesture.moved) return

      if (drawerStateRef.current === 'expanded') {
        setDrawerState('peek')
        return
      }
    }

    const handlePhotoPointerCancel = () => {
      photoGestureRef.current = null
    }

    window.addEventListener('pointermove', handlePhotoPointerMove, true)
    window.addEventListener('pointerup', handlePhotoPointerUp, true)
    window.addEventListener('pointercancel', handlePhotoPointerCancel, true)

    return () => {
      window.removeEventListener('pointermove', handlePhotoPointerMove, true)
      window.removeEventListener('pointerup', handlePhotoPointerUp, true)
      window.removeEventListener(
        'pointercancel',
        handlePhotoPointerCancel,
        true,
      )
    }
  }, [])

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

  const groupsQuery = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session && gallerySource === 'all-groups'),
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
    (gallerySource === 'all-groups' && groupsQuery.isLoading) ||
    (!detailDiscovery && (personalQuery.isLoading || galleryQuery.isLoading))
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
          resolveDiscoveryGroupId(
            nextDiscovery,
            gallerySource,
            groupId,
            groupsQuery.data?.map((group) => group.id),
          ),
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
      groupsQuery.data,
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
    'sterna-discovery-screen fixed inset-0 z-40 !p-0 overflow-hidden'

  const peekSnapPoint = useMeasuredDrawerPeekSnapPoint({
    controlsRef: drawerControlsRef,
    enabled: Boolean(discovery) && !isLoading,
    fallbackSnapPoint: PEEK_FALLBACK_SNAP_POINT,
    measurementKey: discovery?.id ?? null,
  })
  const drawerSnapPoints = [
    MINIMIZED_SNAP_POINT,
    peekSnapPoint,
    EXPANDED_SNAP_POINT,
  ]
  const snapPoint =
    drawerState === 'minimized'
      ? MINIMIZED_SNAP_POINT
      : drawerState === 'expanded'
        ? EXPANDED_SNAP_POINT
        : peekSnapPoint
  const isMinimized = drawerState === 'minimized'
  const isExpanded = drawerState === 'expanded'

  const handleSnapPointChange = (nextSnapPoint: string | number | null) => {
    if (nextSnapPoint === null) return
    if (nextSnapPoint === MINIMIZED_SNAP_POINT) {
      setDrawerState('minimized')
      return
    }
    if (nextSnapPoint === EXPANDED_SNAP_POINT) {
      setDrawerState('expanded')
      return
    }
    setDrawerState('peek')
  }

  useEffect(() => {
    if (!isActionMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setIsActionMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    actionMenuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus()

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isActionMenuOpen])

  if (isLoading) {
    return (
      <main
        className={`${pageClassName} bg-[var(--sterna-viewer-background)]`}
      >
        <div className="absolute left-[max(1rem,var(--sterna-safe-area-left))] top-[max(1rem,var(--sterna-safe-area-top))] z-[60]">
          <FloatingBackButton onClick={handleBack} />
        </div>
        <div className="flex size-full items-center justify-center bg-[var(--sterna-viewer-background)] text-sm text-white/85">
          Loading discovery…
        </div>
      </main>
    )
  }

  if (!discovery) {
    return (
      <main
        className={`${pageClassName} bg-[var(--sterna-viewer-background)]`}
      >
        <div className="absolute left-[max(1rem,var(--sterna-safe-area-left))] top-[max(1rem,var(--sterna-safe-area-top))] z-[60]">
          <FloatingBackButton onClick={handleBack} />
        </div>
        <div className="flex size-full items-center justify-center bg-[var(--sterna-viewer-background)] px-5 text-center text-sm text-white/85">
          Discovery not found.
        </div>
      </main>
    )
  }

  const discoveryGroupId = resolveDiscoveryGroupId(
    discovery,
    gallerySource,
    groupId,
    groupsQuery.data?.map((group) => group.id),
  )
  const isAuthor =
    discovery.userId === undefined || discovery.userId === session?.user.id

  return (
    <main
      className={`${pageClassName} bg-[var(--sterna-viewer-background)]`}
      data-presentation={presentation}
      data-controls-visible={controlsVisible}
      onPointerDownCapture={handlePhotoPointerDown}
    >
      <section
        className="absolute inset-0 h-full w-full bg-[var(--sterna-viewer-background)]"
        aria-label="Discovery photo"
        data-photo-gesture-surface="true"
      >
        <DiscoveryPhotoZoom
          discoveries={galleryDiscoveries}
          activeIndex={activeDiscoveryIndex}
          onView={navigateToSlide}
          zoomRef={zoomRef}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent"
          aria-hidden="true"
        />
      </section>

      <div
        aria-hidden={!controlsVisible}
        className={`pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-between px-[max(1rem,var(--sterna-safe-area-left))] pr-[max(1rem,var(--sterna-safe-area-right))] pt-[max(1rem,var(--sterna-safe-area-top))] transition-opacity duration-200 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
      >
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
                    <Pencil className="size-4" />
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
          className="pointer-events-none absolute left-1/2 top-[max(5rem,var(--sterna-safe-area-top))] z-[70] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-primary/85 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-2 duration-300"
        >
          <Check className="size-4 text-green-200" aria-hidden="true" />
          Discovery added
        </div>
      )}

      <div
        data-testid="discovery-detail-drawer"
        data-drawer-state={drawerState}
        data-snap-points={drawerSnapPoints.join(',')}
        data-peek-snap-point={peekSnapPoint}
        data-expanded-snap-point={EXPANDED_SNAP_POINT}
        data-snap-point={snapPoint}
        className="relative z-50"
      >
        <Drawer
          open
          onOpenChange={(nextOpen, eventDetails) =>
            handleDiscoveryDrawerOpenChange(
              nextOpen,
              eventDetails,
              handleViewerBackRequest,
            )
          }
          modal={false}
          disablePointerDismissal
          snapPoints={drawerSnapPoints}
          snapPoint={snapPoint}
          onSnapPointChange={handleSnapPointChange}
          snapToSequentialPoints
        >
          <DrawerContent
            className="!h-[55dvh] !max-h-[55dvh] border border-white/15 bg-card text-foreground shadow-[0_-12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-[transform,box-shadow] duration-[450ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] will-change-transform data-swiping:duration-0 motion-reduce:transition-none"
          >
            <div
              ref={drawerControlsRef}
              className="relative z-10 rounded-t-[inherit] border-t border-white/15"
            >
              <DrawerSwipeHandle
                data-testid="drawer-handle"
                aria-label={isMinimized ? 'Expand details' : 'Collapse details'}
                onClick={() => {
                  setDrawerState(
                    isExpanded || isMinimized ? 'peek' : 'minimized',
                  )
                }}
                className="h-9 items-center py-0"
              />
              <DrawerHeader className="shrink-0 items-center px-5 pt-0 pb-[max(0.75rem,var(--sterna-safe-area-bottom))] text-center">
                <DrawerTitle render={<h1 className="sr-only" />}>
                  {discovery.name}
                </DrawerTitle>
                <button
                  type="button"
                  tabIndex={isMinimized ? -1 : 0}
                  className="min-h-11 w-full truncate rounded-xl px-0 text-center font-display text-xl font-semibold leading-7 text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-controls="discovery-detail-expanded-content"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setDrawerState(isExpanded ? 'peek' : 'expanded')
                  }
                >
                  {discovery.name}
                </button>
              </DrawerHeader>
            </div>

            <div
              id="discovery-detail-expanded-content"
              data-testid="discovery-detail-expanded-content"
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
  zoomRef,
}: {
  discoveries: Discovery[]
  activeIndex: number
  onView: (index: number) => void
  zoomRef: { current: { zoom: number } | null }
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
          padding: 0,
          preload: 1,
        }}
        zoom={{
          ref: (value) => {
            zoomRef.current = value
          },
          maxZoomPixelRatio: 3,
          doubleTapDelay: 250,
          scrollToZoom: true,
        }}
        styles={{
          root: { backgroundColor: 'transparent' },
          container: { backgroundColor: 'transparent' },
        }}
        controller={{ closeOnBackdropClick: false, closeOnEscape: false }}
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
      className="flex size-full items-center justify-center bg-[var(--sterna-viewer-background)] px-6 text-center text-sm text-white/85"
    >
      {unavailable ? `Photo unavailable for ${name}.` : 'Loading photo…'}
    </div>
  )
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
