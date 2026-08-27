import {
  Check,
  ChevronRight,
  Plus,
  Ticket,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useActiveMap, useSetActiveMap } from '@/hooks/useActiveMap'
import { getGroups, type GroupSummary } from '@/lib/api'
import { loadSession } from '@/lib/session'
import { cn } from '@/lib/utils'

export function GroupsPage() {
  const session = loadSession()
  const { data: activeMap } = useActiveMap()
  const setActiveMap = useSetActiveMap()
  const {
    data: groups,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session),
  })

  const personalIsActive = activeMap ? activeMap.groupId === null : true

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader
        title="Groups"
        action={
          <Button asChild size="icon" variant="ghost" className="size-11">
            <Link to="/groups/new" aria-label="Create group">
              <Plus />
            </Link>
          </Button>
        }
      />
      <div className="space-y-5 px-5">
        <section>
          <h2 className="mb-3 text-sm font-semibold">Active map</h2>
          <p className="mb-3 text-sm leading-5 text-muted-foreground">
            New discoveries are saved to the map selected here.
          </p>
          <div className="space-y-3">
            <MapChoice
              active={personalIsActive}
              disabled={setActiveMap.isPending}
              onSelect={() => setActiveMap.mutate(null)}
              icon={<UserRound className="size-5" />}
              name="Personal map"
              detail="Your private discoveries"
            />
            {groups?.map((group) => (
              <MapChoice
                key={group.id}
                active={group.isActive}
                disabled={setActiveMap.isPending}
                onSelect={() => setActiveMap.mutate(group.id)}
                icon={<UsersRound className="size-5" />}
                name={group.name}
                detail={groupDetailLine(group)}
              />
            ))}
          </div>
          {setActiveMap.isError && (
            <p role="status" className="mt-3 text-sm text-destructive">
              Unable to change the active map.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Your groups</h2>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading groups...</p>
          )}
          {isError && (
            <p role="status" className="text-sm text-destructive">
              Unable to load your groups.
            </p>
          )}
          {groups && groups.length === 0 && (
            <p className="text-sm leading-5 text-muted-foreground">
              You are not in any group yet. Create one to share a map, or join a
              friend's group with their invitation code.
            </p>
          )}
          <div className="space-y-3">
            {groups?.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-[#fbf1ec] text-[#b8572b]">
                  <UsersRound className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{group.name}</span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {groupDetailLine(group)}
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

        <Button asChild variant="outline" className="h-12 w-full">
          <Link to="/groups/join">
            <Ticket className="size-4" />
            Join with a code
          </Link>
        </Button>
      </div>
    </main>
  )
}

function MapChoice({
  active,
  disabled,
  onSelect,
  icon,
  name,
  detail,
}: {
  active: boolean
  disabled: boolean
  onSelect: () => void
  icon: React.ReactNode
  name: string
  detail: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || active}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-4 text-left',
        active
          ? 'border-primary/20 bg-green-50'
          : 'border-border bg-card shadow-sm disabled:opacity-60',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full',
          active
            ? 'bg-primary text-primary-foreground'
            : 'bg-[#fbf1ec] text-[#b8572b]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{name}</span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">
          {detail}
        </span>
      </span>
      {active && (
        <span className="flex items-center gap-1 text-sm font-semibold text-primary">
          <Check className="size-4" />
          Active
        </span>
      )}
    </button>
  )
}

function groupDetailLine(group: GroupSummary): string {
  const members =
    group.memberCount === 1 ? '1 member' : `${group.memberCount} members`
  const discoveries =
    group.discoveryCount === 1
      ? '1 discovery'
      : `${group.discoveryCount} discoveries`

  return `${members} · ${discoveries}`
}
