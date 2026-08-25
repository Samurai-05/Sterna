import { ChevronRight, Plus, UsersRound } from 'lucide-react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { groups } from '@/lib/mock-data'

export function GroupsPage() {
  return (
    <main className="min-h-dvh bg-background pb-28">
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
        <section className="rounded-2xl border border-primary/20 bg-green-50 p-4">
          <p className="text-sm text-muted-foreground">Active map</p>
          <h2 className="mt-1 font-display text-[22px] font-semibold">
            Personal map
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your private discoveries
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold">Your groups</h2>
          <div className="space-y-3">
            {groups.map((group) => (
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
                    {group.members.length} members · {group.discoveryIds.length}{' '}
                    discoveries
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
