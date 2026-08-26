import { ImagePlus, MapPin, Pencil } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { createDiscovery } from '@/lib/api'
import { categories, type DiscoveryCategory } from '@/lib/mock-data'
import {
  openNativePhotoCapture,
  type SelectedPhoto,
} from '@/lib/photo-capture'
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
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState<DiscoveryCategory | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [longitude, setLongitude] = useState('2.3522')
  const [latitude, setLatitude] = useState('48.8566')
  const [formMessage, setFormMessage] = useState('')

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

  const photoUrl = nativePhoto
    ? Capacitor.convertFileSrc(nativePhoto.path)
    : browserPhotoUrl

  async function handleChangePhoto() {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const replacement = await openNativePhotoCapture()
        if (replacement) {
          setBrowserPhoto(null)
          setNativePhoto(replacement)
        }
      } catch (error) {
        console.error('Unable to change discovery photo', error)
      }
      return
    }

    if (photoInputRef.current) {
      photoInputRef.current.value = ''
      photoInputRef.current.click()
    }
  }

  const mutation = useMutation({
    mutationFn: createDiscovery,
    onSuccess: (discovery) => {
      queryClient.invalidateQueries({ queryKey: ['discoveries'] })
      navigate(`/discoveries/${discovery.id}`)
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

    mutation.mutate({
      accessToken: session.accessToken,
      title: title.trim() || 'Untitled discovery',
      description: description.trim() || null,
      category,
      longitude: Number(longitude),
      latitude: Number(latitude),
      imageObjectKey: `discoveries/manual-${Date.now()}.jpg`,
      discoveredAt: new Date().toISOString(),
    })
  }

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="New discovery" backTo="/" />
      {!session && (
        <div className="mb-4 px-5">
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
      <form
        onSubmit={handleSubmit}
        className="space-y-4 px-5 pb-2"
      >
        <section className="space-y-2">
          <p className="text-sm font-semibold">Photo</p>
          <div className="relative overflow-hidden rounded-2xl">
            <input
              ref={photoInputRef}
              id="discovery-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Discovery photo"
              onChange={(event) => {
                setNativePhoto(undefined)
                setBrowserPhoto(event.target.files?.[0] ?? null)
              }}
            />
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  alt="Selected discovery photo"
                  className="h-44 w-full rounded-2xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => void handleChangePhoto()}
                  className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/70 bg-card/95 px-3.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Pencil className="size-4" />
                  Change photo
                </button>
              </>
            ) : (
              <label
                htmlFor="discovery-photo"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/45 bg-green-50 px-4 text-center text-sm text-muted-foreground transition-colors hover:bg-green-100 focus-within:ring-3 focus-within:ring-ring/50"
              >
                <ImagePlus className="size-7 text-primary" />
                <span className="font-medium text-foreground">
                  Choose a photo from your device
                </span>
                <span className="text-xs">
                  JPEG, PNG or WebP · 10 MB maximum
                </span>
              </label>
            )}
          </div>
        </section>
        <label className="block space-y-1.5 text-sm font-semibold">
          <span>
            Title <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give it a name"
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="What did you discover?"
            className="w-full rounded-xl border border-border bg-card p-3 text-sm font-normal leading-5 outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <section className="space-y-2.5">
          <p className="text-sm font-semibold">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={category === item.id}
                onClick={() =>
                  setCategory((current) =>
                    current === item.id ? null : item.id,
                  )
                }
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${category === item.id ? 'border-primary bg-green-50 text-primary' : 'border-border bg-card hover:bg-muted'}`}
              >
                <CategoryIcon category={item.id} className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-primary" />
            Destination: Personal map
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            GPS will propose a location when it is available. For now, enter
            coordinates manually.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs font-semibold">
              Longitude
              <input
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                required
                type="number"
                step="any"
                min="-180"
                max="180"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Latitude
              <input
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                required
                type="number"
                step="any"
                min="-90"
                max="90"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
          </div>
        </section>
        <div className="sticky bottom-0 z-10 -mx-5 w-[calc(100%+2.5rem)] border-t border-border/80 bg-background/95 px-5 pb-[max(0.75rem,var(--sterna-safe-area-bottom))] pt-3 backdrop-blur">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-12 w-full shadow-sm"
          >
            {mutation.isPending ? 'Saving discovery...' : 'Save discovery'}
          </Button>
        </div>
        {formMessage && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            {formMessage}
          </p>
        )}
      </form>
    </main>
  )
}
