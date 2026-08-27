import { Check, LoaderCircle, UserRound, UsersRound, X } from 'lucide-react'

import type { GroupSummary } from '@/lib/api'
import { cn } from '@/lib/utils'

type MapSwitcherSheetProps = {
  activeGroupId: string | null
  groups?: GroupSummary[]
  isPending: boolean
  isError: boolean
  onClose: () => void
  onSelect: (groupId: string | null) => void
}

export function MapSwitcherSheet({
  activeGroupId,
  groups,
  isPending,
  isError,
  onClose,
  onSelect,
}: MapSwitcherSheetProps) {
  const personalIsActive = activeGroupId === null

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        aria-label="Close map picker"
        className="absolute inset-0 bg-stone-950/35 backdrop-blur-[1px]"
        onClick={onClose}
        disabled={isPending}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-picker-title"
        aria-busy={isPending}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !isPending) onClose()
        }}
        className="absolute inset-x-0 bottom-0 max-h-[min(80dvh,38rem)] overflow-y-auto rounded-t-[2rem] border-t border-border bg-card px-5 pb-[max(1.5rem,var(--sterna-safe-area-bottom))] pt-3 shadow-[0_-16px_40px_rgba(28,25,23,0.18)]"
      >
        <div
          className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border"
          aria-hidden="true"
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Current map
            </p>
            <h2
              id="map-picker-title"
              className="mt-1 font-display text-2xl font-semibold"
            >
              Choose a map
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close map picker"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            onClick={onClose}
            disabled={isPending}
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          Choose where your map discoveries should be shown and saved.
        </p>
        <div className="mt-5 space-y-2">
          <MapOption
            active={personalIsActive}
            disabled={isPending || personalIsActive}
            icon={<UserRound className="size-5" />}
            name="Personal map"
            detail="Your private discoveries"
            onSelect={() => onSelect(null)}
          />
          {groups?.map((group) => (
            <MapOption
              key={group.id}
              active={group.id === activeGroupId}
              disabled={isPending || group.id === activeGroupId}
              icon={<UsersRound className="size-5" />}
              name={group.name}
              detail={`${group.memberCount} ${group.memberCount === 1 ? 'member' : 'members'} · ${group.discoveryCount} ${group.discoveryCount === 1 ? 'discovery' : 'discoveries'}`}
              onSelect={() => onSelect(group.id)}
            />
          ))}
        </div>
        {isPending && (
          <p
            role="status"
            className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-primary"
          >
            <LoaderCircle className="size-4 animate-spin" />
            Switching map…
          </p>
        )}
        {isError && !isPending && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-destructive"
          >
            Unable to change the active map. Please try again.
          </p>
        )}
      </section>
    </div>
  )
}

function MapOption({
  active,
  disabled,
  icon,
  name,
  detail,
  onSelect,
}: {
  active: boolean
  disabled: boolean
  icon: React.ReactNode
  name: string
  detail: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
        active
          ? 'border-primary/20 bg-green-50'
          : 'border-border bg-card hover:bg-muted disabled:opacity-60',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          active
            ? 'bg-primary text-primary-foreground'
            : 'bg-[#FBF1EC] text-[#B8572B]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{name}</span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
          {detail}
        </span>
      </span>
      {active && (
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          <Check className="size-4" />
          Active
        </span>
      )}
    </button>
  )
}
