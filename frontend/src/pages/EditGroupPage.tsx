import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { ApiError, getGroup, updateGroup, type GroupDetail } from '@/lib/api'
import { loadSession } from '@/lib/session'

export function EditGroupPage() {
  const { groupId } = useParams()
  const session = loadSession()
  const {
    data: group,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['group', session?.user.id, groupId],
    queryFn: () => getGroup(session!.accessToken, groupId!),
    enabled: Boolean(session && groupId),
  })

  const backTo = groupId ? `/groups/${groupId}` : '/groups'

  if (isLoading) {
    return <EditGroupMessage message="Loading..." backTo={backTo} />
  }
  if (error instanceof ApiError && error.status === 404) {
    return <EditGroupMessage message="Group not found." backTo="/groups" />
  }
  if (!group || !session || !groupId) {
    return (
      <EditGroupMessage message="Unable to load this group." backTo={backTo} />
    )
  }
  if (group.role !== 'owner') {
    return (
      <EditGroupMessage
        message="Only the group owner can edit this group."
        backTo={backTo}
      />
    )
  }

  return (
    <EditGroupForm
      key={group.id}
      group={group}
      accessToken={session.accessToken}
      userId={session.user.id}
    />
  )
}

function EditGroupForm({
  group,
  accessToken,
  userId,
}: {
  group: GroupDetail
  accessToken: string
  userId: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')
  const [formMessage, setFormMessage] = useState('')

  const mutation = useMutation({
    mutationFn: updateGroup,
    onSuccess: (updated) => {
      queryClient.setQueryData(['group', userId, group.id], updated)
      queryClient.invalidateQueries({ queryKey: ['groups', userId] })
      queryClient.invalidateQueries({ queryKey: ['active-map', userId] })
      navigate(`/groups/${group.id}`, { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) {
        setFormMessage('Only the group owner can edit this group.')
        return
      }

      setFormMessage(
        error instanceof Error ? error.message : 'Unable to update the group.',
      )
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage('')

    const nextName = name.trim()
    const nextDescription = description.trim() || null

    // The API rejects an empty body with a 400, so short-circuit a no-op save.
    if (nextName === group.name && nextDescription === group.description) {
      navigate(`/groups/${group.id}`, { replace: true })
      return
    }

    mutation.mutate({
      accessToken,
      groupId: group.id,
      ...(nextName === group.name ? {} : { name: nextName }),
      ...(nextDescription === group.description
        ? {}
        : { description: nextDescription }),
    })
  }

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Edit group" backTo={`/groups/${group.id}`} />
      <form onSubmit={handleSubmit} className="space-y-6 px-5">
        <label className="block space-y-2 text-sm font-semibold">
          Group name
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold">
          Description (optional)
          <textarea
            rows={3}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this group about?"
            className="w-full rounded-xl border border-border bg-card p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <Button
          type="submit"
          className="h-12 w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Saving...' : 'Save changes'}
        </Button>
        {formMessage && (
          <p role="status" className="text-sm leading-5 text-destructive">
            {formMessage}
          </p>
        )}
      </form>
    </main>
  )
}

function EditGroupMessage({
  message,
  backTo,
}: {
  message: string
  backTo: string
}) {
  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Edit group" backTo={backTo} />
      <div className="px-5 text-sm text-muted-foreground">{message}</div>
    </main>
  )
}
