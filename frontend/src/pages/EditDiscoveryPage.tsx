import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { getDiscoveries } from '@/lib/api'
import { discoveries } from '@/lib/mock-data'

export function EditDiscoveryPage() {
  const { discoveryId } = useParams()
  const { data: backendDiscoveries } = useQuery({
    queryKey: ['discoveries'],
    queryFn: getDiscoveries,
  })
  const sourceDiscoveries = backendDiscoveries ?? discoveries
  const discovery =
    sourceDiscoveries.find((item) => item.id === Number(discoveryId)) ?? null
  const navigate = useNavigate()
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (discovery) {
      setTitle(discovery.name)
    }
  }, [discovery])

  if (!discovery) {
    return (
      <main className="min-h-dvh bg-background pb-8">
        <PageHeader title="Edit discovery" backTo="/collection" />
        <div className="px-5 text-sm text-muted-foreground">
          Discovery not found.
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-background pb-8">
      <PageHeader
        title="Edit discovery"
        backTo={`/discoveries/${discovery.id}`}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          navigate(`/discoveries/${discovery.id}`)
        }}
        className="space-y-6 px-5"
      >
        <label className="block space-y-2 text-sm font-semibold">
          Title
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold">
          Description
          <textarea
            defaultValue={discovery.description}
            rows={5}
            className="w-full rounded-xl border border-border bg-card p-3 text-sm font-normal leading-5 outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <Button type="submit" className="h-12 w-full">
          Save changes
        </Button>
      </form>
    </main>
  )
}
