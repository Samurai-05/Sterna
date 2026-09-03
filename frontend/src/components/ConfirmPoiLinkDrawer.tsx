import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

export interface ConfirmPoiLinkItem {
  id: string
  title: string
  subtitle?: string
  thumbnail?: ReactNode
}

/**
 * A generic "pick one of these" bottom sheet used by both confirm-to-unlock
 * flows (forward-looking, from a just-saved discovery; retroactive, from an
 * undiscovered POI's page). Each call site maps its own data into `items`
 * and supplies its own thumbnail, so this component has no POI/discovery
 * specific logic.
 */
export function ConfirmPoiLinkDrawer({
  open,
  title,
  description,
  items,
  emptyMessage = 'Nothing to show.',
  onPick,
  onDismiss,
}: {
  open: boolean
  title: string
  description?: string
  items: ConfirmPoiLinkItem[]
  emptyMessage?: string
  onPick: (id: string) => void
  onDismiss: () => void
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss()
      }}
      showSwipeHandle
    >
      <DrawerContent className="max-h-[70dvh] border border-border/80 bg-card">
        <DrawerHeader className="px-5 pt-1 pb-2">
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
          {items.length === 0 && (
            <p className="px-1 py-3 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item.id)}
                  className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted [&>img]:size-full [&>img]:object-cover">
                    {item.thumbnail}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-sm font-medium">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-primary" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <DrawerFooter className="px-5 pb-[max(1rem,var(--sterna-safe-area-bottom))] pt-2">
          <Button type="button" variant="outline" onClick={onDismiss}>
            Not now
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
