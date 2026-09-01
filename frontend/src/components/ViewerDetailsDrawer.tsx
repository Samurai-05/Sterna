import type { RefObject } from 'react'
import { useRef } from 'react'

import { DiscoveryDetailsContent } from '@/components/DiscoveryDetailsContent'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerSwipeHandle,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useMeasuredDrawerSnapPoint } from '@/hooks/useMeasuredDrawerSnapPoint'
import type { Discovery } from '@/lib/mock-data'

const VIEWER_PEEK_SNAP_POINT = '3.5rem'

export function ViewerDetailsDrawer({
  discovery,
  expanded,
  groupId,
  isAuthor,
  onExpandedChange,
  portalContainer,
}: {
  discovery: Discovery
  expanded: boolean
  groupId?: string | null
  isAuthor: boolean
  onExpandedChange: (expanded: boolean) => void
  portalContainer: RefObject<HTMLDivElement | null>
}) {
  const controlsRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const expandedSnapPoint = useMeasuredDrawerSnapPoint({
    controlsRef,
    contentRef,
    isExpanded: expanded,
    measurementKey: discovery.id,
    onSnapPointChange: (nextSnapPoint) => {
      onExpandedChange(nextSnapPoint !== VIEWER_PEEK_SNAP_POINT)
    },
  })
  const snapPoints = [
    VIEWER_PEEK_SNAP_POINT,
    expandedSnapPoint ?? VIEWER_PEEK_SNAP_POINT,
  ] as const
  const snapPoint =
    expanded && expandedSnapPoint !== null
      ? expandedSnapPoint
      : VIEWER_PEEK_SNAP_POINT

  return (
    <div
      data-testid="viewer-details-drawer"
      className="pointer-events-none absolute inset-0"
    >
      <Drawer
        open
        onOpenChange={() => undefined}
        modal={false}
        disablePointerDismissal
        snapPoints={[...snapPoints]}
        snapPoint={snapPoint}
        onSnapPointChange={(nextSnapPoint) => {
          if (nextSnapPoint !== null) {
            onExpandedChange(nextSnapPoint !== VIEWER_PEEK_SNAP_POINT)
          }
        }}
        snapToSequentialPoints
      >
        <DrawerContent
          contentDriven
          portalContainer={portalContainer}
          className="pointer-events-auto bg-card text-foreground shadow-[0_-12px_40px_rgba(0,0,0,0.28)]"
        >
          <div ref={controlsRef} className="relative z-10">
            <div data-testid="viewer-details-handle">
              <DrawerSwipeHandle />
            </div>
            <DrawerHeader
              className={`px-5 pt-0 pb-3 text-left ${expanded ? '' : 'pointer-events-none opacity-0'}`}
            >
              <DrawerTitle
                render={
                  <h2 className="truncate font-display text-xl font-semibold leading-7" />
                }
              >
                {discovery.name}
              </DrawerTitle>
            </DrawerHeader>
          </div>

          <div
            ref={contentRef}
            aria-hidden={!expanded}
            data-base-ui-swipe-ignore=""
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,var(--sterna-safe-area-bottom))] ${!expanded ? 'pointer-events-none invisible' : ''}`}
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
  )
}
