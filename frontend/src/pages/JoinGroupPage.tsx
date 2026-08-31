import { QrCode } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { QrScanner } from '@/components/QrScanner'
import { Button } from '@/components/ui/button'
import { ApiError, joinGroup } from '@/lib/api'
import { ensureCameraPermission, isQrScanAvailable } from '@/lib/qr-scan'
import { loadSession } from '@/lib/session'

export function JoinGroupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = loadSession()
  const [inviteCode, setInviteCode] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [scanning, setScanning] = useState(false)

  const mutation = useMutation({
    mutationFn: joinGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups', session?.user.id] })
      navigate(`/groups/${group.id}`, { replace: true })
    },
    onError: (error) => {
      // The API answers 404 for any code it cannot resolve, malformed included.
      if (error instanceof ApiError && error.status === 404) {
        setFormMessage('No group matches this code.')
        return
      }

      setFormMessage(
        error instanceof Error ? error.message : 'Unable to join the group.',
      )
    },
  })

  function joinWithCode(code: string) {
    setFormMessage('')

    if (!session) {
      setFormMessage('Log in before joining a group.')
      return
    }

    mutation.mutate({
      accessToken: session.accessToken,
      inviteCode: code.trim(),
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    joinWithCode(inviteCode)
  }

  async function startScanning() {
    setFormMessage('')

    const granted = await ensureCameraPermission()
    if (!granted) {
      setFormMessage(
        'Camera access was denied. Enter the invitation code instead.',
      )
      return
    }

    setScanning(true)
  }

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Join a group" backTo="/groups" />
      <form onSubmit={handleSubmit} className="space-y-6 px-5">
        <p className="text-sm leading-5 text-muted-foreground">
          Ask a member for the group's invitation code, then enter it here.
        </p>
        <label className="block space-y-2 text-sm font-semibold">
          Invitation code
          <input
            required
            autoFocus
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={inviteCode}
            onChange={(event) =>
              setInviteCode(event.target.value.toUpperCase())
            }
            placeholder="AB3K-9QZ2"
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <Button
          type="submit"
          className="h-12 w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Joining group...' : 'Join group'}
        </Button>
        {isQrScanAvailable() && (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full"
            disabled={mutation.isPending}
            onClick={() => void startScanning()}
          >
            <QrCode className="size-4" />
            Scan QR code instead
          </Button>
        )}
        {formMessage && (
          <p role="status" className="text-sm leading-5 text-destructive">
            {formMessage}
          </p>
        )}
      </form>
      {scanning && (
        <QrScanner
          onScan={(code) => {
            setScanning(false)
            setInviteCode(code.toUpperCase())
            joinWithCode(code)
          }}
          onCancel={() => setScanning(false)}
          onError={(error) => {
            setScanning(false)
            setFormMessage(
              error instanceof Error
                ? error.message
                : 'Unable to scan the code. Enter it manually instead.',
            )
          }}
        />
      )}
    </main>
  )
}
