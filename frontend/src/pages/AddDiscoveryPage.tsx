import { Camera, Check, ImagePlus, MapPin } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { LocationPickerMap } from '@/components/LocationPickerMap'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { createDiscovery, uploadPhoto } from '@/lib/api'
import { categories, type DiscoveryCategory } from '@/lib/mock-data'
import { type SelectedPhoto } from '@/lib/photo-capture'
import { loadSession } from '@/lib/session'

type AddDiscoveryLocationState = {
  selectedPhoto?: SelectedPhoto
}

type UploadedPhoto = Awaited<ReturnType<typeof uploadPhoto>>

async function readPhotoForUpload(
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

    return {
      photo: nativeBlob.type
        ? nativeBlob
        : new Blob([nativeBlob], { type: nativePhoto.mimeType }),
      fileName: nativePhoto.fileName,
    }
  }

  throw new Error('Select a photo before saving the discovery.')
}

function getExifCoordinates(
  exif: UploadedPhoto['exif'],
): [number, number] | null {
  if (!exif) return null
  if (
    !Number.isFinite(exif.latitude) ||
    !Number.isFinite(exif.longitude) ||
    exif.latitude < -90 ||
    exif.latitude > 90 ||
    exif.longitude < -180 ||
    exif.longitude > 180
  ) {
    return null
  }

  return [exif.longitude, exif.latitude]
}

export function AddDiscoveryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const session = loadSession()
  const accessToken = session?.accessToken

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
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedPhoto | null>(null)
  const [photoUploadStatus, setPhotoUploadStatus] = useState<
    'idle' | 'uploading' | 'ready' | 'error'
  >(session && selectedPhoto ? 'uploading' : 'idle')
  const manualLocationChanged = useRef(false)
  const photoUploadRequest = useRef(0)

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

  useEffect(() => {
    const requestId = ++photoUploadRequest.current

    if (!accessToken || !photoSelected) {
      return
    }

    let active = true

    void (async () => {
      try {
        const { photo, fileName } = await readPhotoForUpload(
          nativePhoto,
          browserPhoto,
        )
        const result = await uploadPhoto(accessToken, photo, fileName)
        if (!active || photoUploadRequest.current !== requestId) return

        setUploadedPhoto(result)
        setPhotoUploadStatus('ready')
        const exifCoordinates = getExifCoordinates(result.exif)
        if (exifCoordinates && !manualLocationChanged.current) {
          setCoordinates(exifCoordinates)
        }
      } catch (error) {
        if (!active || photoUploadRequest.current !== requestId) return
        setPhotoUploadStatus('error')
        setFormMessage(
          error instanceof Error
            ? error.message
            : 'Unable to process the selected photo.',
        )
      }
    })()

    return () => {
      active = false
    }
  }, [accessToken, browserPhoto, nativePhoto, photoSelected])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Log in before saving a discovery.')

      if (!uploadedPhoto) {
        throw new Error('Unable to process the selected photo.')
      }

      return createDiscovery({
        accessToken: session.accessToken,
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
      queryClient.invalidateQueries({
        queryKey: ['discoveries', session?.user.id],
      })
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
        <section>
          <p className="mb-2 text-sm font-semibold">Photo</p>
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/45 bg-green-50 text-center text-sm text-muted-foreground">
            <input
              type="file"
              aria-label="Choose discovery photo"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const nextPhoto = event.target.files?.[0] ?? null
                setUploadedPhoto(null)
                setPhotoUploadStatus(
                  nextPhoto && accessToken ? 'uploading' : 'idle',
                )
                setFormMessage('')
                setNativePhoto(undefined)
                setBrowserPhoto(nextPhoto)
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
            Destination: Personal map
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap the map to drop a pin where this was discovered, or drag the pin
            to adjust it.
          </p>
          <div className="mt-3 h-56 w-full overflow-hidden rounded-xl border border-border">
            <LocationPickerMap
              coordinates={coordinates}
              onChange={(nextCoordinates) => {
                manualLocationChanged.current = true
                setCoordinates(nextCoordinates)
              }}
              className="h-full w-full"
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
          </p>
        </section>
        <Button
          type="submit"
          disabled={mutation.isPending || photoUploadStatus === 'uploading'}
          className="h-12 w-full"
        >
          {photoUploadStatus === 'uploading'
            ? 'Processing photo...'
            : mutation.isPending
              ? 'Saving discovery...'
              : 'Save discovery'}
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
