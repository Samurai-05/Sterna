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
import { personalMapName } from '@/lib/personal-map-name'
import { cn } from '@/lib/utils'

export function GroupsPage() {
  const session = loadSession()
  const { data: activeMap, isPending: isLoadingActiveMap } = useActiveMap()
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
  const personalIsActive = activeMap?.groupId === null
  const personalMapLabel = personalMapName(session?.user.userName)

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
          <h2 className="mb-3 text-sm font-semibold">Your maps</h2>
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
            <div
              aria-label={personalMapLabel}
              aria-current={personalIsActive ? 'true' : undefined}
              className={cn(
                'flex min-h-20 items-center gap-3 rounded-2xl border p-4',
                personalIsActive
                  ? 'border-primary/20 bg-green-50'
                  : 'border-border bg-card shadow-sm',
              )}
            >
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-full',
                  personalIsActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-violet-100 text-violet-800',
                )}
              >
                <UserRound className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{personalMapLabel}</span>
                <span className="mt-1 block truncate text-sm text-muted-foreground">
                  Your private discoveries
                </span>
              </span>
              {personalIsActive ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <Check className="size-4" />
                  Active
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Activate ${personalMapLabel}`}
                  disabled={isLoadingActiveMap || setActiveMap.isPending}
                  onClick={() => setActiveMap.mutate(null)}
                >
                  {isLoadingActiveMap
                    ? 'Loading...'
                    : setActiveMap.isPending
                      ? 'Activating...'
                      : 'Activate'}
                </Button>
              )}
            </div>
            {groups?.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                aria-current={group.isActive ? 'true' : undefined}
                className={cn(
                  'flex min-h-20 items-center gap-3 rounded-2xl border p-4',
                  group.isActive
                    ? 'border-primary/20 bg-green-50'
                    : 'border-border bg-card shadow-sm',
                )}
              >
                <span
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full',
                    group.isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-[#fbf1ec] text-[#b8572b]',
                  )}
                >
                  <UsersRound className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{group.name}</span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {groupDetailLine(group)}
                  </span>
                </span>
                {group.isActive ? (
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <Check className="size-4" />
                    Active
                  </span>
                ) : (
                  <ChevronRight className="size-5 text-muted-foreground" />
                )}
              </Link>
            ))}
          </div>
          {setActiveMap.isError && (
            <p role="status" className="mt-3 text-sm text-destructive">
              Unable to activate the personal map.
            </p>
          )}
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

function groupDetailLine(group: GroupSummary): string {
  const members =
    group.memberCount === 1 ? '1 member' : `${group.memberCount} members`
  const discoveries =
    group.discoveryCount === 1
      ? '1 discovery'
      : `${group.discoveryCount} discoveries`

  return `${members} · ${discoveries}`
}
