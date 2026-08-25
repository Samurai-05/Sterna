import { useState } from 'react'
import { useNavigate } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export function CreateGroupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  return (
    <main className="min-h-dvh bg-background pb-8">
      <PageHeader title="Create a group" backTo="/groups" />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          navigate('/groups')
        }}
        className="space-y-6 px-5"
      >
        <p className="text-sm leading-5 text-muted-foreground">
          A group has a shared active map where each member can add discoveries.
        </p>
        <label className="block space-y-2 text-sm font-semibold">
          Group name
          <input
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Paris Weekend"
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <Button type="submit" className="h-12 w-full">
          Create group
        </Button>
      </form>
    </main>
  )
}
