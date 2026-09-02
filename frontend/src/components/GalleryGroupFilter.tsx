import { UserRound, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'

import type { GroupSummary } from '@/lib/api'

type GalleryGroupFilterProps = {
  groups: GroupSummary[]
  value: string
  onValueChange: (value: string) => void
  personalMapName?: string
}

export const PERSONAL_MAP = 'personal'
export const ALL_GROUPS = 'groups'

export function GalleryGroupFilter({
  groups,
  value,
  onValueChange,
  personalMapName = 'Personal map',
}: GalleryGroupFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter gallery by source"
      className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <GroupFilterButton
        active={value === PERSONAL_MAP}
        label={personalMapName}
        onClick={() => onValueChange(PERSONAL_MAP)}
        icon={<UserRound className="size-4" aria-hidden="true" />}
      />
      <GroupFilterButton
        active={value === ALL_GROUPS}
        label="All groups"
        onClick={() => onValueChange(ALL_GROUPS)}
        icon={<UsersRound className="size-4" aria-hidden="true" />}
      />
      {groups.map((group) => (
        <GroupFilterButton
          key={group.id}
          active={value === group.id}
          label={group.name}
          onClick={() => onValueChange(group.id)}
          icon={<UsersRound className="size-4" aria-hidden="true" />}
        />
      ))}
    </div>
  )
}

function GroupFilterButton({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean
  label: string
  onClick: () => void
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-9 w-max max-w-40 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 ${
        active
          ? 'border-primary bg-accent text-primary'
          : 'border-border bg-card text-foreground'
      }`}
    >
      {icon && (
        <span
          className={`shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}
