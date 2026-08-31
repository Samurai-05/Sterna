import { Check, ChevronDown, Filter, UserRound, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { DropdownMenu } from 'radix-ui'

import { Button } from '@/components/ui/button'
import type { GroupSummary } from '@/lib/api'

type GalleryGroupFilterProps = {
  groups: GroupSummary[]
  value: string
  onValueChange: (value: string) => void
}

const PERSONAL_GROUP = 'personal'
const ALL_GROUPS = 'all'

export function GalleryGroupFilter({
  groups,
  value,
  onValueChange,
}: GalleryGroupFilterProps) {
  const selectedLabel = getGroupLabel(value, groups)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-label={`Filter discoveries by group: ${selectedLabel}`}
          className="min-w-0 max-w-[calc(100vw-6.5rem)] justify-start rounded-xl bg-card px-3 shadow-sm"
        >
          <Filter className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown
            className="ml-1 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 w-64 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-lg outline-none"
        >
          <div className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">
            Show discoveries from
          </div>
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            <GroupOption value={ALL_GROUPS} label="All" />
            <GroupOption
              value={PERSONAL_GROUP}
              label="Personal"
              icon={<UserRound className="size-4" aria-hidden="true" />}
            />
            {groups.length > 0 && (
              <DropdownMenu.Separator className="mx-2 my-1 h-px bg-border" />
            )}
            {groups.map((group) => (
              <GroupOption
                key={group.id}
                value={group.id}
                label={group.name}
                icon={<UsersRound className="size-4" aria-hidden="true" />}
              />
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function GroupOption({
  value,
  label,
  icon,
}: {
  value: string
  label: string
  icon?: ReactNode
}) {
  return (
    <DropdownMenu.RadioItem
      value={value}
      className="flex h-10 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-sm font-medium text-foreground outline-none transition-colors data-[highlighted]:bg-muted data-[state=checked]:bg-green-50 [&[data-state=checked]>span:first-child]:bg-primary [&[data-state=checked]>span:first-child]:text-primary-foreground"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon ?? <Filter className="size-3.5" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <DropdownMenu.ItemIndicator>
        <Check className="size-4 text-primary" aria-hidden="true" />
      </DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  )
}

function getGroupLabel(value: string, groups: GroupSummary[]) {
  if (value === PERSONAL_GROUP) return 'Personal'
  if (value === ALL_GROUPS) return 'All'

  return groups.find((group) => group.id === value)?.name ?? 'All'
}
