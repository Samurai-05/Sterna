import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { UserAvatarImage } from '@/components/UserAvatarImage'
import { Button } from '@/components/ui/button'
import {
  ApiError,
  changePassword,
  getCurrentUser,
  updateProfile,
  uploadPhoto,
} from '@/lib/api'
import { clearSession, loadSession, saveSession } from '@/lib/session'

export function EditProfilePage() {
  const navigate = useNavigate()
  const session = loadSession()
  const accessToken = session?.accessToken

  const {
    data: user,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['current-user', accessToken],
    queryFn: () => getCurrentUser(accessToken!),
    enabled: Boolean(accessToken),
  })

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      clearSession()
      navigate('/auth', { replace: true })
    }
  }, [error, navigate])

  if (isLoading) {
    return <EditProfileMessage message="Loading..." />
  }
  if (!user || !accessToken) {
    return <EditProfileMessage message="Unable to load your profile." />
  }

  return (
    <main className="min-h-dvh bg-background pb-10">
      <PageHeader title="Edit profile" backTo="/profile" />
      <ProfileForm
        key={user.avatarObjectKey}
        accessToken={accessToken}
        user={user}
      />
      <PasswordForm accessToken={accessToken} />
    </main>
  )
}

function ProfileForm({
  accessToken,
  user,
}: {
  accessToken: string
  user: { userName: string; avatarObjectKey: string | null }
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [userName, setUserName] = useState(user.userName)
  const [browserPhoto, setBrowserPhoto] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [formMessage, setFormMessage] = useState('')

  const browserPhotoUrl = useMemo(
    () => (browserPhoto ? URL.createObjectURL(browserPhoto) : null),
    [browserPhoto],
  )

  useEffect(() => {
    return () => {
      if (browserPhotoUrl) URL.revokeObjectURL(browserPhotoUrl)
    }
  }, [browserPhotoUrl])

  const photoUpload = useMutation({
    mutationFn: (photo: File) => uploadPhoto(accessToken, photo, photo.name),
  })

  useEffect(() => {
    if (!browserPhoto) return
    photoUpload.mutate(browserPhoto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserPhoto])

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(['current-user', accessToken], updated)
      saveSession({ accessToken, user: updated })
      navigate('/profile', { replace: true })
    },
    onError: (error) => {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the profile.',
      )
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage('')

    const nextUserName = userName.trim()
    const nameChanged = nextUserName !== user.userName
    const avatarObjectKey = photoRemoved
      ? null
      : (photoUpload.data?.objectKey ?? undefined)
    const avatarChanged = avatarObjectKey !== undefined

    if (!nameChanged && !avatarChanged) {
      navigate('/profile', { replace: true })
      return
    }

    mutation.mutate({
      accessToken,
      ...(nameChanged ? { userName: nextUserName } : {}),
      ...(avatarChanged ? { avatarObjectKey } : {}),
    })
  }

  const previewObjectKey = photoRemoved ? null : user.avatarObjectKey
  const initial = (userName.trim().charAt(0) || '?').toUpperCase()
  const isUploadingPhoto = photoUpload.isPending
  const canSave = !mutation.isPending && !isUploadingPhoto

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-5">
      <section className="flex flex-col items-center gap-3">
        <span className="relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-[#C4622D] font-display text-4xl font-semibold text-white">
          {browserPhotoUrl ? (
            <img
              src={browserPhotoUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <UserAvatarImage
              accessToken={accessToken}
              avatarObjectKey={previewObjectKey}
              initial={initial}
            />
          )}
        </span>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setBrowserPhoto(file)
              if (file) setPhotoRemoved(false)
              photoUpload.reset()
            }}
          />
          <Camera className="size-4" />
          Change photo
        </label>
        {(previewObjectKey || browserPhotoUrl) && (
          <button
            type="button"
            onClick={() => {
              setBrowserPhoto(null)
              setPhotoRemoved(true)
              photoUpload.reset()
            }}
            className="flex h-9 items-center gap-1.5 text-sm font-semibold text-destructive"
          >
            <X className="size-4" />
            Remove photo
          </button>
        )}
        {isUploadingPhoto && (
          <p className="text-xs text-muted-foreground">Uploading photo...</p>
        )}
        {photoUpload.isError && (
          <p className="text-xs text-destructive">
            Unable to upload that photo. Try a JPEG, PNG or WebP under 10 MB.
          </p>
        )}
      </section>
      <label className="block space-y-2 text-sm font-semibold">
        Display name
        <input
          required
          minLength={2}
          maxLength={100}
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
        />
      </label>
      <Button type="submit" className="h-12 w-full" disabled={!canSave}>
        {mutation.isPending ? 'Saving...' : 'Save changes'}
      </Button>
      {formMessage && (
        <p role="status" className="text-sm leading-5 text-destructive">
          {formMessage}
        </p>
      )}
    </form>
  )
}

function PasswordForm({ accessToken }: { accessToken: string }) {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')

  const mutation = useMutation({
    mutationFn: changePassword,
    // Changing the password invalidates every token issued before it — this
    // device's included, since the API mints no replacement (ADR-009,
    // amended). Staying on the page would leave the user inside the shell
    // holding a token every request now 401s on, so the session is discarded
    // here rather than discovered to be dead on the next screen.
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setConfirmMessage('Password updated. Signing you out…')
      clearSession()
      navigate('/login', {
        replace: true,
        state: {
          notice: 'Password updated. Sign in again with your new password.',
        },
      })
    },
    onError: (error) => {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to change the password.',
      )
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage('')
    setConfirmMessage('')

    if (newPassword !== confirmNewPassword) {
      setFormMessage('The new password and its confirmation do not match.')
      return
    }

    mutation.mutate({ accessToken, currentPassword, newPassword })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-6 border-t border-border px-5 pt-8"
    >
      <h2 className="sterna-section-title">Password</h2>
      <PasswordInput
        id="edit-profile-current-password"
        label="Current password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <PasswordInput
        id="edit-profile-new-password"
        label="New password"
        autoComplete="new-password"
        required
        minLength={12}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
      <PasswordInput
        id="edit-profile-confirm-new-password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        value={confirmNewPassword}
        onChange={(event) => setConfirmNewPassword(event.target.value)}
      />
      <Button
        type="submit"
        variant="outline"
        className="h-12 w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Changing password...' : 'Change password'}
      </Button>
      {formMessage && (
        <p role="status" className="text-sm leading-5 text-destructive">
          {formMessage}
        </p>
      )}
      {confirmMessage && (
        <p role="status" className="text-sm leading-5 text-primary">
          {confirmMessage}
        </p>
      )}
    </form>
  )
}

function EditProfileMessage({ message }: { message: string }) {
  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Edit profile" backTo="/profile" />
      <div className="px-5 text-sm text-muted-foreground">{message}</div>
    </main>
  )
}
