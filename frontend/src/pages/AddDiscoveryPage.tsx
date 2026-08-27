import { Camera, ImagePlus, MapPin, UserRound, UsersRound } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { MapSwitcherSheet } from '@/components/MapSwitcherSheet'
import {
  LocationPickerMap,
  type LocationPickerMapHandle,
} from '@/components/LocationPickerMap'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useBackHandler } from '@/lib/back-navigation'
import { createDiscovery, getGroups, uploadPhoto } from '@/lib/api'
import {
  activeMapName,
  useActiveMap,
  useSetActiveMap,
} from '@/hooks/useActiveMap'
import { categories, type DiscoveryCategory } from '@/lib/mock-data'
import { openNativePhotoCapture, type SelectedPhoto } from '@/lib/photo-capture'
import { loadSession } from '@/lib/session'

type AddDiscoveryLocationState = {
  selectedPhoto?: SelectedPhoto
}

const defaultCoordinates: [number, number] = [2.3522, 48.8566]

/** Resolves whichever photo the user selected (native or browser) into bytes. */
async function readSelectedPhoto(
  nativePhoto: SelectedPhoto | undefined,
  browserPhoto: File | null,
): Promise<{ photo: Blob; fileName: string }> {
  if (browserPhoto) {
    return { photo: browserPhoto, fileName: browserPhoto.name }
  }

  if (nativePhoto) {
    const response = await fetch(Capacitor.convertFileSrc(nativePhoto.path))
    if (!response.ok) throw new Error('Unable to read the selected photo.')
    const nativeBlob = await response.blob()
    const photo = nativeBlob.type
      ? nativeBlob
      : new Blob([nativeBlob], { type: nativePhoto.mimeType })
    return { photo, fileName: nativePhoto.fileName }
  }

  throw new Error('Select a photo before saving the discovery.')
}

export function AddDiscoveryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const session = loadSession()
  const locationPickerRef = useRef<LocationPickerMapHandle>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const selectedPhoto = (location.state as AddDiscoveryLocationState | null)
    ?.selectedPhoto

  const [nativePhoto, setNativePhoto] = useState(selectedPhoto)
  const [browserPhoto, setBrowserPhoto] = useState<File | null>(null)

  const [category, setCategory] = useState<DiscoveryCategory>('other')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coordinates, setCoordinates] =
    useState<[number, number]>(defaultCoordinates)
  const [locationSource, setLocationSource] = useState<
    'default' | 'photo' | 'manual'
  >('default')
  const [formMessage, setFormMessage] = useState('')
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const [isOpeningCamera, setIsOpeningCamera] = useState(false)

  const { data: activeMap, isPending: isLoadingActiveMap } = useActiveMap()
  const setActiveMap = useSetActiveMap()
  const activeGroupId = activeMap?.groupId ?? null
  useBackHandler(
    () => {
      if (!isMapPickerOpen) return false
      if (!setActiveMap.isPending) setIsMapPickerOpen(false)
      return true
    },
    isMapPickerOpen,
  )
  // Until the active map is known, and while a switch is still in flight, the
  // destination is unsettled — saving now could file the discovery under the
  // previous map.
  const isDestinationSettled = !isLoadingActiveMap && !setActiveMap.isPending
  const { data: groups } = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session),
  })

  function selectBrowserPhoto(file: File | null) {
    setNativePhoto(undefined)
    setBrowserPhoto(file)
    photoUpload.reset()
    setFormMessage('')
  }

  function selectNativePhoto(photo: SelectedPhoto | null) {
    if (!photo) return
    setNativePhoto(photo)
    setBrowserPhoto(null)
    photoUpload.reset()
    setFormMessage('')
  }

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

  async function handleCameraAction() {
    if (Capacitor.getPlatform() !== 'android') {
      cameraInputRef.current?.click()
      return
    }

    setIsOpeningCamera(true)
    try {
      selectNativePhoto(await openNativePhotoCapture())
    } catch {
      setFormMessage('Unable to open the camera. Please try again.')
    } finally {
      setIsOpeningCamera(false)
    }
  }

  // Uploads the photo as soon as it's selected (rather than on submit) so its
  // EXIF GPS location — if any — can propose the discovery's position before
  // the user saves, per issue #122 part 1. The result is reused at submit
  // time instead of uploading the same photo twice.
  const photoUpload = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Log in before uploading a photo.')
      const { photo, fileName } = await readSelectedPhoto(
        nativePhoto,
        browserPhoto,
      )
      return uploadPhoto(session.accessToken, photo, fileName)
    },
    onSuccess: (uploadedPhoto) => {
      if (uploadedPhoto.exif) {
        const nextCoordinates: [number, number] = [
          uploadedPhoto.exif.longitude,
          uploadedPhoto.exif.latitude,
        ]
        setCoordinates(nextCoordinates)
        setLocationSource('photo')
        locationPickerRef.current?.flyTo(nextCoordinates)
      }
    },
  })

  const isLoggedIn = Boolean(session)

  useEffect(() => {
    if (!isLoggedIn || !photoSelected) return
    photoUpload.mutate()
    // Depend on isLoggedIn (a stable boolean) rather than `session` itself:
    // loadSession() returns a new object every render, which would otherwise
    // re-fire this effect — and re-upload the photo — on every state update
    // triggered by its own onSuccess handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, nativePhoto, browserPhoto])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Log in before saving a discovery.')

      const uploadedPhoto = photoUpload.data
      if (!uploadedPhoto) {
        throw new Error('Wait for the photo to finish uploading.')
      }

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

    if (photoUpload.isPending) {
      setFormMessage('The photo is still uploading — please wait.')
      return
    }

    if (photoUpload.isError || !photoUpload.data) {
      setFormMessage('The photo failed to upload. Choose it again to retry.')
      return
    }

    if (!isDestinationSettled) {
      setFormMessage('Hold on, the destination map is still being set.')
      return
    }

    mutation.mutate()
  }

  function handleLocationChange(nextCoordinates: [number, number]) {
    setCoordinates(nextCoordinates)
    setLocationSource('manual')
  }

  function handleSelectMap(groupId: string | null) {
    setActiveMap.mutate(groupId, {
      onSuccess: () => setIsMapPickerOpen(false),
    })
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
        <section>
          <p className="mb-2 text-sm font-semibold">Photo</p>
          <input
            id="discovery-gallery-input"
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) =>
              selectBrowserPhoto(event.target.files?.[0] ?? null)
            }
          />
          {!photoSelected ? (
            <label
              htmlFor="discovery-gallery-input"
              className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/45 bg-green-50 px-5 text-center text-sm text-muted-foreground"
            >
              <ImagePlus className="size-9 text-primary" />
              <span>Choose a photo from your device</span>
              <span className="text-xs">JPEG, PNG or WebP · 10 MB maximum</span>
            </label>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-stone-100 shadow-sm">
              <img
                src={photoUrl ?? undefined}
                alt="Selected discovery photo"
                className="max-h-[32rem] min-h-64 w-full object-cover"
              />
            </div>
          )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={(event) =>
              selectBrowserPhoto(event.target.files?.[0] ?? null)
            }
          />
          {photoSelected ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                Change photo
              </button>
              <button
                type="button"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                onClick={() => void handleCameraAction()}
                disabled={isOpeningCamera}
              >
                <Camera className="size-4" />
                {isOpeningCamera ? 'Opening camera…' : 'Retake'}
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-11 w-full"
              onClick={() => void handleCameraAction()}
              disabled={isOpeningCamera}
            >
              <Camera className="size-4" />
              {isOpeningCamera ? 'Opening camera…' : 'Take a photo'}
            </Button>
          )}
        </section>
        <section className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-primary">
            {activeGroupId ? (
              <UsersRound className="size-4" />
            ) : (
              <UserRound className="size-4" />
            )}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted-foreground">Saving to: </span>
            <span className="font-semibold">
              {isLoadingActiveMap ? '...' : activeMapName(activeMap)}
            </span>
          </p>
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:bg-green-50 disabled:opacity-50"
            disabled={isLoadingActiveMap || setActiveMap.isPending}
            aria-haspopup="dialog"
            aria-expanded={isMapPickerOpen}
            onClick={() => {
              setActiveMap.reset()
              setIsMapPickerOpen(true)
            }}
          >
            Change
          </button>
        </section>
        {isMapPickerOpen && (
          <MapSwitcherSheet
            activeGroupId={activeGroupId}
            groups={groups}
            isPending={setActiveMap.isPending}
            isError={setActiveMap.isError}
            onClose={() => setIsMapPickerOpen(false)}
            onSelect={handleSelectMap}
          />
        )}
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
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-primary" />
            Location
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {photoUpload.isPending && 'Looking for a location in the photo...'}
            {!photoUpload.isPending &&
              locationSource === 'photo' &&
              'Location detected from the photo. Tap or drag the pin to adjust it.'}
            {!photoUpload.isPending &&
              locationSource !== 'photo' &&
              'Tap the map to drop a pin where this was discovered, or drag the pin to adjust it.'}
          </p>
          <div className="mt-3 h-56 w-full overflow-hidden rounded-xl border border-border">
            <LocationPickerMap
              ref={locationPickerRef}
              coordinates={coordinates}
              onChange={handleLocationChange}
              className="h-full w-full"
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
          </p>
        </section>
        <Button
          type="submit"
          disabled={mutation.isPending || !isDestinationSettled}
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
