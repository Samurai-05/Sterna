import {
  Check,
  Copy,
  Map,
  Pencil,
  Trash2,
  UserMinus,
  UsersRound,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { DiscoveryCard } from '@/components/DiscoveryCard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useSetActiveMap } from '@/hooks/useActiveMap'
import {
  ApiError,
  deleteGroup,
  getGroup,
  getGroupDiscoveries,
  initialsOf,
  leaveGroup,
} from '@/lib/api'
import { loadSession } from '@/lib/session'

export function GroupDetailPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = loadSession()
  const userId = session?.user.id
  const setActiveMap = useSetActiveMap()
  const [formMessage, setFormMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const {
    data: group,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['group', userId, groupId],
    queryFn: () => getGroup(session!.accessToken, groupId!),
    enabled: Boolean(session && groupId),
  })

  const { data: groupDiscoveries } = useQuery({
    queryKey: ['group-discoveries', userId, groupId],
    queryFn: () => getGroupDiscoveries(session!.accessToken, groupId!),
    enabled: Boolean(session && groupId),
  })

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const membershipEnded = () => {
    queryClient.invalidateQueries({ queryKey: ['groups', userId] })
    queryClient.invalidateQueries({ queryKey: ['active-map', userId] })
    queryClient.invalidateQueries({ queryKey: ['discoveries', userId] })
    queryClient.invalidateQueries({ queryKey: ['pois', userId] })
    queryClient.removeQueries({ queryKey: ['group', userId, groupId] })
    queryClient.removeQueries({
      queryKey: ['group-discoveries', userId, groupId],
    })
    navigate('/groups', { replace: true })
  }

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(session!.accessToken, groupId!),
    onSuccess: membershipEnded,
    onError: (leaveError) => {
      setFormMessage(
        leaveError instanceof Error
          ? leaveError.message
          : 'Unable to leave the group.',
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(session!.accessToken, groupId!),
    onSuccess: membershipEnded,
    onError: (deleteError) => {
      setFormMessage(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete the group.',
      )
    },
  })

  if (isLoading) {
    return <GroupMessage message="Loading group..." />
  }

  // A non-member is answered 404, never 403, so the group must not be named here.
  if (error instanceof ApiError && error.status === 404) {
    return <GroupMessage message="Group not found." />
  }

  if (!group) {
    return <GroupMessage message="Unable to load this group." />
  }

  const loadedGroup = group
  const isOwner = loadedGroup.role === 'owner'

  function activateGroup() {
    setFormMessage('')
    setActiveMap.mutate(loadedGroup.id, {
      onSuccess: () => {
        queryClient.setQueryData(['group', userId, loadedGroup.id], {
          ...loadedGroup,
          isActive: true,
        })
      },
      onError: () => setFormMessage('Unable to activate this group.'),
    })
  }

  async function copyInviteCode(code: string) {
    try {
      await navigator.clipboard?.writeText(code)
      setCopied(true)
    } catch {
      setFormMessage('Unable to copy the code. Select it and copy it manually.')
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader
        title="Group"
        backTo="/groups"
        action={
          <div className="flex items-center gap-1">
            {!group.isActive && (
              <Button
                size="sm"
                variant="ghost"
                className="h-10 px-3"
                disabled={setActiveMap.isPending}
                onClick={activateGroup}
              >
                <Map className="size-4" />
                {setActiveMap.isPending ? 'Activating...' : 'Activate'}
              </Button>
            )}
            {isOwner && (
              <Button asChild size="icon" variant="ghost" className="size-11">
                <Link to={`/groups/${group.id}/edit`} aria-label="Edit group">
                  <Pencil className="size-5" />
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-6 px-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <UsersRound className="size-4" />
            Group map
          </p>
          <h1 className="sterna-screen-title mt-2">{group.name}</h1>
          {group.description && (
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              {group.description}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {group.memberCount} members · {group.discoveryCount} discoveries
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="sterna-section-title">Invite others</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Share this code. Anyone who enters it joins the group.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border bg-background text-lg font-semibold tracking-[0.3em]">
              {formatInviteCode(group.inviteCode)}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="size-11 shrink-0"
              aria-label="Copy invitation code"
              onClick={() => void copyInviteCode(group.inviteCode)}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          {copied && (
            <p role="status" className="mt-2 text-sm text-primary">
              Code copied.
            </p>
          )}
        </section>

        {group.isActive && (
          <p className="flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-green-50 text-sm font-semibold text-primary">
            <Check className="size-4" />
            This is your active map
          </p>
        )}

        <section>
          <h2 className="sterna-section-title mb-3">Members</h2>
          <ul className="space-y-2">
            {group.members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initialsOf(member.userName)}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {member.userName}
                </span>
                {member.role === 'owner' && (
                  <span className="shrink-0 rounded-full bg-[#fbf1ec] px-2 py-1 text-xs font-semibold text-[#b8572b]">
                    Owner
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="sterna-section-title mb-3">Recent discoveries</h2>
          {groupDiscoveries && groupDiscoveries.length === 0 ? (
            <p className="text-sm leading-5 text-muted-foreground">
              No discoveries yet. Set this group as your active map, then add
              one.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {groupDiscoveries?.map((discovery) => (
                <DiscoveryCard
                  key={discovery.id}
                  discovery={discovery}
                  groupId={group.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          {isOwner ? (
            <Button
              variant="outline"
              className="h-12 w-full text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                setFormMessage('')
                if (
                  window.confirm(
                    'Delete this group permanently? Its discoveries return to their authors’ personal maps.',
                  )
                ) {
                  deleteMutation.mutate()
                }
              }}
            >
              <Trash2 className="size-4" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete group'}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-12 w-full text-destructive"
              disabled={leaveMutation.isPending}
              onClick={() => {
                setFormMessage('')
                if (
                  window.confirm(
                    'Leave this group? Your discoveries here move back to your personal map.',
                  )
                ) {
                  leaveMutation.mutate()
                }
              }}
            >
              <UserMinus className="size-4" />
              {leaveMutation.isPending ? 'Leaving...' : 'Leave group'}
            </Button>
          )}
          {formMessage && (
            <p role="status" className="text-sm leading-5 text-destructive">
              {formMessage}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

function GroupMessage({ message }: { message: string }) {
  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Group" backTo="/groups" />
      <div className="px-5 text-sm text-muted-foreground">{message}</div>
    </main>
  )
}

/** Codes are issued as 8 characters; the API normalises spaces and dashes away. */
function formatInviteCode(code: string): string {
  if (code.length !== 8) return code

  return `${code.slice(0, 4)}-${code.slice(4)}`
}
