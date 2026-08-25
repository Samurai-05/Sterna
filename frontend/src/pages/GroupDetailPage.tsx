import { Copy, Map, UsersRound } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { DiscoveryCard } from '@/components/DiscoveryCard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { discoveries, groups } from '@/lib/mock-data'

export function GroupDetailPage() {
  const { groupId } = useParams()
  const group = groups.find((item) => item.id === groupId) ?? groups[0]
  const groupDiscoveries = discoveries.filter((item) =>
    group.discoveryIds.includes(item.id),
  )
  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Group" backTo="/groups" />
      <div className="space-y-6 px-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <UsersRound className="size-4" />
                Group map
              </p>
              <h1 className="sterna-screen-title mt-2">{group.name}</h1>
            </div>
            <Button
              size="icon"
              variant="outline"
              className="size-11"
              aria-label="Copy invitation code"
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="mt-3 text-sm leading-5 text-muted-foreground">
            {group.description}
          </p>
          <div className="mt-4 flex -space-x-2">
            {group.members.map((member) => (
              <span
                key={member.initials}
                title={member.name}
                className="flex size-9 items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-bold text-primary-foreground"
              >
                {member.initials}
              </span>
            ))}
          </div>
        </section>
        <Button asChild className="h-12 w-full">
          <Link to="/">
            {' '}
            <Map className="size-4" />
            Open active map
          </Link>
        </Button>
        <section>
          <h2 className="sterna-section-title mb-3">Recent discoveries</h2>
          <div className="grid grid-cols-2 gap-3">
            {groupDiscoveries.map((discovery) => (
              <DiscoveryCard key={discovery.id} discovery={discovery} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
