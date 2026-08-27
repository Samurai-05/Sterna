import {
  Camera,
  Check,
  ImagePlus,
  MapPin,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { LocationPickerMap } from '@/components/LocationPickerMap'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { createDiscovery, getGroups, uploadPhoto } from '@/lib/api'
import { useActiveMap, useSetActiveMap } from '@/hooks/useActiveMap'
import { categories, type DiscoveryCategory } from '@/lib/mock-data'
import { type SelectedPhoto } from '@/lib/photo-capture'
import { loadSession } from '@/lib/session'

type AddDiscoveryLocationState = {
  selectedPhoto?: SelectedPhoto
}

export function AddDiscoveryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const session = loadSession()

  const selectedPhoto = (location.state as AddDiscoveryLocationState | null)
    ?.selectedPhoto

  const [nativePhoto, setNativePhoto] = useState(selectedPhoto)
  const [browserPhoto, setBrowserPhoto] = useState<File | null>(null)

  const [category, setCategory] = useState<DiscoveryCategory>('other')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coordinates, setCoordinates] = useState<[number, number]>([
    2.3522, 48.8566,
  ])
  const [formMessage, setFormMessage] = useState('')

  const { data: activeMap } = useActiveMap()
  const setActiveMap = useSetActiveMap()
  const activeGroupId = activeMap?.groupId ?? null
  const { data: groups } = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session),
  })

  const browserPhotoUrl = useMemo(
    () => (browserPhoto ? URL.createObjectURL(browserPhoto) : null),
    [browserPhoto],
  )

  useEffect(() => {
    return () => {
      if (browserPhotoUrl) {
        URL.revokeObjectURL(browserPhotoUrl)
      }
    }
  }, [browserPhotoUrl])

  const photoSelected = Boolean(nativePhoto || browserPhoto)

  const photoUrl = nativePhoto
    ? Capacitor.convertFileSrc(nativePhoto.path)
    : browserPhotoUrl

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Log in before saving a discovery.')

      let photo: Blob
      let fileName: string

      if (browserPhoto) {
        photo = browserPhoto
        fileName = browserPhoto.name
      } else if (nativePhoto) {
        const response = await fetch(Capacitor.convertFileSrc(nativePhoto.path))
        if (!response.ok) throw new Error('Unable to read the selected photo.')
        const nativeBlob = await response.blob()
        photo = nativeBlob.type
          ? nativeBlob
          : new Blob([nativeBlob], { type: nativePhoto.mimeType })
        fileName = nativePhoto.fileName
      } else {
        throw new Error('Select a photo before saving the discovery.')
      }

      const uploadedPhoto = await uploadPhoto(
        session.accessToken,
        photo,
        fileName,
      )

      return createDiscovery({
        accessToken: session.accessToken,
        groupId: activeGroupId,
        title,
        description: description.trim() || null,
        category,
        longitude: coordinates[0],
        latitude: coordinates[1],
        imageObjectKey: uploadedPhoto.objectKey,
        discoveredAt: uploadedPhoto.exif?.takenAt ?? new Date().toISOString(),
      })
    },
    onSuccess: (discovery) => {
      // A group discovery lives on two maps: the group's and its author's own.
      queryClient.invalidateQueries({
        queryKey: ['discoveries', session?.user.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['group-discoveries', session?.user.id],
      })
      queryClient.invalidateQueries({ queryKey: ['groups', session?.user.id] })
      navigate(`/discoveries/${discovery.id}`, {
        state: { returnTo: '/' },
        replace: true,
      })
    },
    onError: (error) => {
      setFormMessage(
        error instanceof Error ? error.message : 'Unable to save discovery.',
      )
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage('')

    if (!session) {
      setFormMessage('Log in before saving a discovery.')
      return
    }

    if (!photoSelected) {
      setFormMessage('Select a photo before saving the discovery.')
      return
    }

    mutation.mutate()
  }

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="New discovery" backTo="/" />
      {!session && (
        <div className="mb-5 px-5">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Log in required</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your discovery will be saved to your personal map.
            </p>
            <Button asChild className="mt-3 h-11 w-full">
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6 px-5">
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">
            Saving to: {activeMap?.name ?? 'Personal map'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick another destination to move this discovery, and your active
            map, to it.
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <DestinationChip
              active={activeGroupId === null}
              disabled={setActiveMap.isPending}
              onClick={() => setActiveMap.mutate(null)}
            >
              <UserRound className="size-4" />
              Personal map
            </DestinationChip>
            {groups?.map((group) => (
              <DestinationChip
                key={group.id}
                active={activeGroupId === group.id}
                disabled={setActiveMap.isPending}
                onClick={() => setActiveMap.mutate(group.id)}
              >
                <UsersRound className="size-4" />
                {group.name}
              </DestinationChip>
            ))}
          </div>
        </section>
        <section>
          <p className="mb-2 text-sm font-semibold">Photo</p>
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/45 bg-green-50 text-center text-sm text-muted-foreground">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                setNativePhoto(undefined)
                setBrowserPhoto(event.target.files?.[0] ?? null)
              }}
            />
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Selected discovery photo"
                className="h-40 w-full rounded-2xl object-cover"
              />
            ) : photoSelected ? (
              <Check className="size-8 text-primary" />
            ) : (
              <ImagePlus className="size-8 text-primary" />
            )}
            <span>
              {photoSelected
                ? 'Photo selected'
                : 'Choose a photo from your device'}
            </span>
            <span className="text-xs">JPEG, PNG or WebP · 10 MB maximum</span>
          </label>
          <Button type="button" variant="outline" className="mt-3 h-11 w-full">
            <Camera className="size-4" />
            Take a photo
          </Button>
        </section>
        <label className="block space-y-2 text-sm font-semibold">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="Name your discovery"
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="What did you discover?"
            className="w-full rounded-xl border border-border bg-card p-3 text-sm font-normal leading-5 outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <section className="space-y-2">
          <p className="text-sm font-semibold">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium ${category === item.id ? 'border-primary bg-green-50 text-primary' : 'border-border bg-card'}`}
              >
                <CategoryIcon category={item.id} className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Other is selected automatically when no category is chosen.
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-primary" />
            Location
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap the map to drop a pin where this was discovered, or drag the pin
            to adjust it.
          </p>
          <div className="mt-3 h-56 w-full overflow-hidden rounded-xl border border-border">
            <LocationPickerMap
              coordinates={coordinates}
              onChange={setCoordinates}
              className="h-full w-full"
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
          </p>
        </section>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="h-12 w-full"
        >
          {mutation.isPending ? 'Saving discovery...' : 'Save discovery'}
        </Button>
        {formMessage && (
          <p
            role="status"
            className="text-center text-sm text-muted-foreground"
          >
            {formMessage}
          </p>
        )}
      </form>
    </main>
  )
}

function DestinationChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}
    >
      {children}
    </button>
  )
}
