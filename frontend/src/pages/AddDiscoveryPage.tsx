import { Camera, Check, ImagePlus, MapPin } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { createDiscovery } from '@/lib/api'
import { categories, type DiscoveryCategory } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'

export function AddDiscoveryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = loadSession()
  const [category, setCategory] = useState<DiscoveryCategory>('other')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [longitude, setLongitude] = useState('2.3522')
  const [latitude, setLatitude] = useState('48.8566')
  const [photoSelected, setPhotoSelected] = useState(false)
  const [formMessage, setFormMessage] = useState('')
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
      title,
      description: description.trim() || null,
      category,
      longitude: Number(longitude),
      latitude: Number(latitude),
      imageObjectKey: `discoveries/manual-${Date.now()}.jpg`,
      discoveredAt: new Date().toISOString(),
    })
  }

  return (
    <main className="min-h-dvh bg-background pb-8">
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
      <form
        onSubmit={handleSubmit}
        className="space-y-6 px-5"
      >
        <section>
          <p className="mb-2 text-sm font-semibold">Photo</p>
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/45 bg-green-50 text-center text-sm text-muted-foreground">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={() => setPhotoSelected(true)}
            />
            {photoSelected ? (
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
            GPS will propose a location when it is available. For now, enter
            coordinates manually.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
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
        <Button type="submit" disabled={mutation.isPending} className="h-12 w-full">
          {mutation.isPending ? 'Saving discovery...' : 'Save discovery'}
        </Button>
        {formMessage && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            {formMessage}
          </p>
        )}
      </form>
    </main>
  )
}
