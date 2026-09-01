import { ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import { DiscoveryDetailsContent } from '@/components/DiscoveryDetailsContent'
import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { ViewerDetailsDrawer } from '@/components/ViewerDetailsDrawer'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerSwipeHandle,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog'
import { deleteDiscovery, getDiscovery, getGroupDiscoveries } from '@/lib/api'
import { getDiscoveryRouteState } from '@/lib/route-state'
import { loadSession } from '@/lib/session'
import { useMeasuredDrawerSnapPoint } from '@/hooks/useMeasuredDrawerSnapPoint'

const PEEK_SNAP_POINT = '5rem'

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isViewerDetailsExpanded, setIsViewerDetailsExpanded] = useState(false)
  const [detailPhotoSource, setDetailPhotoSource] = useState<string | null>(
    null,
  )
  const [snapPoint, setSnapPoint] = useState<string | number>(PEEK_SNAP_POINT)
  const actionMenuRef = useRef<HTMLDivElement>(null)
  const actionTriggerRef = useRef<HTMLButtonElement>(null)
  const drawerControlsRef = useRef<HTMLDivElement>(null)
  const expandedContentRef = useRef<HTMLDivElement>(null)
  const viewerControlsRef = useRef<HTMLDivElement>(null)
  const routeState = getDiscoveryRouteState(location.state)
  const returnTo = routeState.returnTo ?? '/collection'

  const handleBack = () => {
    if (routeState.backgroundLocation) {
      navigate(-1)
      return
    }

    navigate(returnTo, { replace: true })
  }

  const closeViewer = useCallback(() => {
    setIsViewerDetailsExpanded(false)
    setIsViewerOpen(false)
  }, [])

  const personalQuery = useQuery({
    queryKey: ['discovery', session?.user.id, discoveryId],
    queryFn: () => getDiscovery(session!.accessToken, discoveryId!),
    enabled: Boolean(session && discoveryId && !groupId),
  })

  // Shares its cache with the group map, so opening a card is usually instant.
  const groupQuery = useQuery({
    queryKey: ['group-discoveries', session?.user.id, groupId],
    queryFn: () => getGroupDiscoveries(session!.accessToken, groupId!),
    select: (items) =>
      items.find((item) => String(item.id) === discoveryId) ?? null,
    enabled: Boolean(session && discoveryId && groupId),
  })

  const discovery = groupId ? groupQuery.data : personalQuery.data
  const isLoading = groupId ? groupQuery.isLoading : personalQuery.isLoading
  const deleteMutation = useMutation({
    mutationFn: () => deleteDiscovery(session!.accessToken, discoveryId!),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ['discovery', session?.user.id, discoveryId],
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
      handleBack()
    },
  })

  const pageClassName =
    'sterna-discovery-screen fixed inset-0 z-40 !p-0 overflow-hidden bg-stone-950'
  const slides = useMemo(
    () =>
      discovery
        ? detailPhotoSource
          ? [{ src: detailPhotoSource, alt: discovery.name }]
          : []
        : [],
    [detailPhotoSource, discovery],
  )

  const isNormalDrawerExpanded = snapPoint !== PEEK_SNAP_POINT
  const expandedSnapPoint = useMeasuredDrawerSnapPoint({
    controlsRef: drawerControlsRef,
    contentRef: expandedContentRef,
    enabled: Boolean(discovery),
    isExpanded: isNormalDrawerExpanded,
    measurementKey: discovery?.id ?? null,
    onSnapPointChange: setSnapPoint,
  })

  useEffect(() => {
    if (!isViewerOpen || Capacitor.getPlatform() !== 'android') return

    let active = true
    let listener: { remove: () => Promise<void> } | undefined

    void CapacitorApp.addListener('backButton', () => {
      if (!active) return
      if (isViewerDetailsExpanded) {
        setIsViewerDetailsExpanded(false)
      } else {
        closeViewer()
      }
    }).then((handle) => {
      if (active) {
        listener = handle
      } else {
        void handle.remove()
      }
    })

    return () => {
      active = false
      void listener?.remove()
    }
  }, [closeViewer, isViewerDetailsExpanded, isViewerOpen])

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

  const isAuthor =
    discovery.userId === undefined || discovery.userId === session?.user.id
  const isExpanded = isNormalDrawerExpanded
  const discoverySnapPoints = [
    PEEK_SNAP_POINT,
    expandedSnapPoint ?? PEEK_SNAP_POINT,
  ] as const

  return (
    <main className={pageClassName} data-presentation={presentation}>
      <section
        className="absolute inset-0 bg-stone-950"
        aria-label="Discovery photo"
      >
        <button
          type="button"
          className="absolute inset-0 z-0 flex size-full cursor-zoom-in items-center justify-center bg-stone-950 p-0"
          aria-label="Open photo"
          disabled={!detailPhotoSource}
          onClick={() => {
            setIsViewerDetailsExpanded(false)
            setIsViewerOpen(true)
          }}
        >
          <DiscoveryPhoto
            discovery={discovery}
            alt={discovery.name}
            variant="detail"
            width={1200}
            className="size-full object-contain"
            onSourceChange={setDetailPhotoSource}
          />
        </button>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent"
          aria-hidden="true"
        />
      </section>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-between px-[max(1rem,var(--sterna-safe-area-left))] pr-[max(1rem,var(--sterna-safe-area-right))] pt-[max(1rem,var(--sterna-safe-area-top))]">
        <FloatingBackButton onClick={handleBack} />
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

      <div
        data-testid="discovery-detail-drawer"
        data-expanded-snap-point={expandedSnapPoint ?? 'null'}
        data-snap-point={snapPoint}
        className="relative z-50"
      >
        <Drawer
          open
          onOpenChange={() => undefined}
          modal={false}
          disablePointerDismissal
          snapPoints={[...discoverySnapPoints]}
          snapPoint={snapPoint}
          onSnapPointChange={(nextSnapPoint) => {
            if (nextSnapPoint !== null) setSnapPoint(nextSnapPoint)
          }}
          snapToSequentialPoints
        >
          <DrawerContent
            contentDriven
            className="bg-card text-foreground shadow-[0_-12px_40px_rgba(28,25,23,0.16)]"
          >
            <div
              ref={drawerControlsRef}
              className={`z-10 ${isExpanded ? 'relative' : 'absolute inset-x-0 bottom-0 bg-card'}`}
            >
              <DrawerSwipeHandle />
              <DrawerHeader className="shrink-0 px-5 pt-0 pb-[max(0.75rem,var(--sterna-safe-area-bottom))] text-left">
                <DrawerTitle render={<h1 className="sr-only" />}>
                  {discovery.name}
                </DrawerTitle>
                <button
                  type="button"
                  className="min-h-11 w-full truncate rounded-xl px-0 text-left font-display text-xl font-semibold leading-7 outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-controls="discovery-detail-expanded-content"
                  aria-expanded={isExpanded}
                  onClick={() => {
                    if (expandedSnapPoint === null) return
                    setSnapPoint(
                      isExpanded ? PEEK_SNAP_POINT : expandedSnapPoint,
                    )
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
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,var(--sterna-safe-area-bottom))] ${!isExpanded ? 'invisible pointer-events-none' : ''}`}
            >
              <DiscoveryDetailsContent
                discovery={discovery}
                groupId={groupId}
                isAuthor={isAuthor}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <Lightbox
        open={isViewerOpen && slides.length > 0}
        close={closeViewer}
        slides={slides}
        plugins={[Zoom]}
        carousel={{ finite: true, imageFit: 'contain', preload: 0 }}
        controller={{ closeOnBackdropClick: false }}
        render={{
          controls: () => (
            <div
              ref={viewerControlsRef}
              data-testid="viewer-controls-root"
              className="pointer-events-none absolute inset-0"
            >
              <ViewerDetailsDrawer
                discovery={discovery}
                expanded={isViewerDetailsExpanded}
                groupId={groupId}
                isAuthor={isAuthor}
                onExpandedChange={setIsViewerDetailsExpanded}
                portalContainer={viewerControlsRef}
              />
            </div>
          ),
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
        labels={{ Close: 'Close photo viewer' }}
      />

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
