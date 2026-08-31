import { Check, UserRound, UsersRound } from 'lucide-react'

import type { GroupSummary } from '@/lib/api'

export function DiscoveryGroupSelector({
  groups = [],
  selectedGroupIds,
  personalSelected,
  onPersonalChange,
  onChange,
}: {
  groups?: GroupSummary[]
  selectedGroupIds: string[]
  personalSelected: boolean
  onPersonalChange: (selected: boolean) => void
  onChange: (groupIds: string[]) => void
}) {
  function toggleGroup(groupId: string) {
    if (
      selectedGroupIds.includes(groupId) &&
      selectedGroupIds.length === 1 &&
      !personalSelected
    ) {
      return
    }
    onChange(
      selectedGroupIds.includes(groupId)
        ? selectedGroupIds.filter((selectedId) => selectedId !== groupId)
        : [...selectedGroupIds, groupId],
    )
  }

  function togglePersonal() {
    if (personalSelected && selectedGroupIds.length === 0) return
    onPersonalChange(!personalSelected)
  }

  return (
    <div>
      <p className="text-sm font-semibold">Add to maps</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Select every map where this discovery should appear.
      </p>
      <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          aria-pressed={personalSelected}
          aria-label="Add to Personal map"
          onClick={togglePersonal}
          className={`flex h-10 w-max shrink-0 snap-start items-center gap-1.5 rounded-xl border px-2 py-1 text-left text-xs transition-colors ${personalSelected ? 'border-primary bg-green-50' : 'border-border bg-background'}`}
        >
          <span
            className={`flex size-5 shrink-0 items-center justify-center rounded-md ${personalSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {personalSelected ? (
              <Check className="size-4" />
            ) : (
              <UserRound className="size-4" />
            )}
          </span>
          <span className="whitespace-nowrap font-medium">Personal map</span>
        </button>
        {groups.map((group) => {
          const selected = selectedGroupIds.includes(group.id)

          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={selected}
              aria-label={`Add to ${group.name}`}
              onClick={() => toggleGroup(group.id)}
              className={`flex h-10 w-max shrink-0 snap-start items-center gap-1.5 rounded-xl border px-2 py-1 text-left text-xs transition-colors ${selected ? 'border-primary bg-green-50' : 'border-border bg-background'}`}
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-md ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                {selected ? (
                  <Check className="size-4" />
                ) : (
                  <UsersRound className="size-4" />
                )}
              </span>
              <span className="whitespace-nowrap font-medium">
                {group.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
