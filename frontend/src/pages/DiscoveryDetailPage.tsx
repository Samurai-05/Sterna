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
import { useSetActiveMap } from '@/hooks/useActiveMap'
import { discoveryPath } from '@/lib/discovery-path'
import {
  handleDiscoveryDrawerOpenChange,
  handleViewerBackRequest as handleViewerBackRequestState,
} from '@/lib/discovery-drawer'
import { resolveDiscoveryGroupId } from '@/lib/discovery-group'
import { getDiscoveryRouteState } from '@/lib/route-state'
import type { MapTarget } from '@/lib/map-target'
import { imageUrl, type Discovery } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'
import { useMeasuredDrawerPeekSnapPoint } from '@/hooks/useMeasuredDrawerPeekSnapPoint'

const PEEK_FALLBACK_SNAP_POINT = 72
const EXPANDED_SNAP_POINT = 0.55
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

type DiscoveryDrawerState = 'peek' | 'expanded'

export function DiscoveryDetailPage({
  presentation = 'page',
}: DiscoveryDetailPageProps) {
  const { discoveryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const session = loadSession()
  const queryClient = useQueryClient()
  const setActiveMap = useSetActiveMap()
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
  const [controlsVisible, setControlsVisible] = useState(true)
  const createdFeedbackConsumedRef = useRef(false)
  const [drawerState, setDrawerState] = useState<DiscoveryDrawerState>('peek')
  const [deletedDiscoveryIds, setDeletedDiscoveryIds] = useState<Set<number>>(
    () => new Set(),
  )
  const actionMenuRef = useRef<HTMLDivElement>(null)
  const actionTriggerRef = useRef<HTMLButtonElement>(null)
  const drawerControlsRef = useRef<HTMLDivElement>(null)
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

  const handleViewerBackRequest = () =>
    handleViewerBackRequestState({
      isDeleteDialogOpen,
      isActionMenuOpen,
      closeDeleteDialog: () => setIsDeleteDialogOpen(false),
      closeActionMenu: () => setIsActionMenuOpen(false),
      restoreActionMenuFocus: () =>
        window.setTimeout(() => actionTriggerRef.current?.focus(), 0),
      handleBack,
    })

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
  const drawerSnapPoints = [peekSnapPoint, EXPANDED_SNAP_POINT]
  const snapPoint =
    drawerState === 'expanded' ? EXPANDED_SNAP_POINT : peekSnapPoint
  const isExpanded = drawerState === 'expanded'

  const handleSnapPointChange = (nextSnapPoint: string | number | null) => {
    if (nextSnapPoint === null) return
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
      <main className={pageClassName}>
        <div className="absolute left-[max(1rem,var(--sterna-safe-area-left))] top-[max(1rem,var(--sterna-safe-area-top))] z-[60]">
          <FloatingBackButton onClick={handleBack} />
        </div>
        <div className="flex size-full items-center justify-center bg-white text-sm text-muted-foreground">
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
        <div className="flex size-full items-center justify-center bg-white px-5 text-center text-sm text-muted-foreground">
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
  const handleShowOnMap = async () => {
    try {
      await setActiveMap.mutateAsync(discoveryGroupId)
      navigate('/', {
        state: {
          mapTarget: {
            coordinates: discovery.coordinates,
            zoom: 16,
            label: discovery.name,
          } satisfies MapTarget,
        },
      })
    } catch {
      // The mutation exposes its error state beside the action below.
    }
  }

  return (
    <main
      className={`${pageClassName} ${controlsVisible ? 'bg-white' : 'bg-black'}`}
      data-presentation={presentation}
      data-controls-visible={controlsVisible}
      onClick={(event) => {
        const target = event.target
        if (
          target instanceof Element &&
          target.closest(
            'button, a, [role="button"], [data-viewer-control="true"]',
          )
        ) {
          return
        }
        setControlsVisible((visible) => !visible)
      }}
    >
      <section
        className={`absolute inset-0 h-full w-full transition-colors duration-200 ${controlsVisible ? 'bg-white' : 'bg-black'}`}
        aria-label="Discovery photo"
      >
        <DiscoveryPhotoZoom
          discoveries={galleryDiscoveries}
          activeIndex={activeDiscoveryIndex}
          onView={navigateToSlide}
        />
        {controlsVisible && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent"
            aria-hidden="true"
          />
        )}
      </section>

      {controlsVisible && (
        <div
          data-viewer-control="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-between px-[max(1rem,var(--sterna-safe-area-left))] pr-[max(1rem,var(--sterna-safe-area-right))] pt-[max(1rem,var(--sterna-safe-area-top))]"
        >
          <FloatingBackButton onClick={handleBack} />
          {isAuthor && (
            <div ref={actionMenuRef} className="pointer-events-auto relative">
              <Button
                ref={actionTriggerRef}
                type="button"
                variant="ghost"
                size="icon-lg"
                className="rounded-full border border-white/80 bg-white/90 text-black shadow-lg backdrop-blur-md hover:bg-white hover:text-black"
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
                  aria-label="Photo actions"
                  className="absolute right-0 top-12 z-10 min-w-52 overflow-hidden rounded-2xl border border-border bg-white p-2 text-foreground shadow-2xl"
                >
                  <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Photo actions
                  </p>
                  <Button
                    asChild
                    variant="ghost"
                    className="h-11 w-full justify-start gap-3 rounded-xl px-3"
                  >
                    <Link
                      role="menuitem"
                      to={`/discoveries/${discovery.id}/edit`}
                      state={{ returnTo }}
                    >
                      <Pencil className="size-4 text-primary" />
                      Edit discovery
                    </Link>
                  </Button>
                  <div className="my-1 h-px bg-border" aria-hidden="true" />
                  <Button
                    type="button"
                    role="menuitem"
                    variant="ghost"
                    className="h-11 w-full justify-start gap-3 rounded-xl px-3 text-destructive hover:bg-destructive-subtle hover:text-destructive"
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
      )}

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
        data-viewer-control="true"
        data-testid="discovery-detail-drawer"
        data-drawer-state={drawerState}
        data-snap-points={drawerSnapPoints.join(',')}
        data-peek-snap-point={peekSnapPoint}
        data-expanded-snap-point={EXPANDED_SNAP_POINT}
        data-snap-point={snapPoint}
        data-controls-visible={controlsVisible}
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
            data-viewer-control="true"
            aria-hidden={!controlsVisible}
            className={`!h-[55dvh] !max-h-[55dvh] border border-border bg-white text-black shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transition-[transform,background-color,color,box-shadow,opacity] duration-[450ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] will-change-transform data-swiping:duration-0 motion-reduce:transition-none ${controlsVisible ? 'opacity-100' : '!pointer-events-none opacity-0'}`}
          >
            <div
              ref={drawerControlsRef}
              className="relative z-10 rounded-t-[inherit] border-t border-border/70"
            >
              <DrawerSwipeHandle
                data-testid="drawer-handle"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                onClick={() => setDrawerState(isExpanded ? 'peek' : 'expanded')}
                className="h-6 items-center py-0"
              />
              <DrawerHeader className="shrink-0 items-center px-5 pt-0 pb-[max(0.5rem,var(--sterna-safe-area-bottom))] text-center">
                <DrawerTitle render={<h1 className="sr-only" />}>
                  {discovery.name}
                </DrawerTitle>
                <div className="flex min-h-9 w-full items-center justify-center">
                  <button
                    type="button"
                    className="w-full truncate rounded-xl px-0 text-center font-sans text-lg !font-bold leading-6 text-black outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40"
                    aria-controls="discovery-detail-expanded-content"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setDrawerState(isExpanded ? 'peek' : 'expanded')
                    }
                  >
                    {discovery.name}
                  </button>
                </div>
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
                onShowOnMap={() => void handleShowOnMap()}
                isShowingOnMap={setActiveMap.isPending}
              />
              {setActiveMap.isError && (
                <p role="status" className="mt-3 text-sm text-destructive">
                  Unable to open this discovery on the map.
                </p>
              )}
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
        className="sterna-discovery-photo-viewer !bg-transparent"
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
      className="flex size-full items-center justify-center bg-transparent px-6 text-center text-sm text-muted-foreground"
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
      className="pointer-events-auto rounded-full border border-border bg-white text-black shadow-lg hover:bg-muted hover:text-black"
      onClick={onClick}
      aria-label="Go back"
    >
      <ArrowLeft className="size-5" />
    </Button>
  )
}
