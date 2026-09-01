import { Camera, Check, ImagePlus, MapPin, Search } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryGroupSelector } from '@/components/DiscoveryGroupSelector'
import {
  LocationPickerMap,
  type LocationPickerMapHandle,
} from '@/components/LocationPickerMap'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  createDiscovery,
  getGroups,
  searchLocations,
  uploadPhoto,
} from '@/lib/api'
import { discoveryPath } from '@/lib/discovery-path'
import { useActiveMap } from '@/hooks/useActiveMap'
import { categories, type DiscoveryCategory } from '@/lib/mock-data'
import { getStoredMapViewport } from '@/lib/map-viewport'
import { type SelectedPhoto } from '@/lib/photo-capture'
import { loadSession } from '@/lib/session'
import { personalMapName } from '@/lib/personal-map-name'

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
  const locationWasChosenRef = useRef(false)

  const selectedPhoto = (location.state as AddDiscoveryLocationState | null)
    ?.selectedPhoto

  const [nativePhoto, setNativePhoto] = useState(selectedPhoto)
  const [browserPhoto, setBrowserPhoto] = useState<File | null>(null)

  const [category, setCategory] = useState<DiscoveryCategory>('other')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coordinates, setCoordinates] = useState<[number, number]>(
    () => getStoredMapViewport()?.center ?? defaultCoordinates,
  )
  const [locationSource, setLocationSource] = useState<
    'default' | 'current' | 'photo' | 'manual' | 'search'
  >('default')
  const [locationQuery, setLocationQuery] = useState('')
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState('')
  const [showLocationResults, setShowLocationResults] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [sharedGroupIds, setSharedGroupIds] = useState<string[]>([])
  const [includePersonal, setIncludePersonal] = useState(false)

  const { data: activeMap, isPending: isLoadingActiveMap } = useActiveMap()
  const activeGroupId = activeMap?.groupId ?? null
  const [destinationsTouched, setDestinationsTouched] = useState(false)
  const selectedGroupIds = destinationsTouched
    ? sharedGroupIds
    : activeGroupId
      ? [activeGroupId]
      : []
  const personalSelected = destinationsTouched
    ? includePersonal
    : activeGroupId === null
  // Until the active map is known, saving could file the discovery under the
  // personal map instead of its intended group.
  const isDestinationSettled = !isLoadingActiveMap
  const { data: groups } = useQuery({
    queryKey: ['groups', session?.user.id],
    queryFn: () => getGroups(session!.accessToken),
    enabled: Boolean(session),
  })
  const locationSearch = useQuery({
    queryKey: ['discovery-location-search', debouncedLocationQuery],
    queryFn: () =>
      searchLocations(session!.accessToken, debouncedLocationQuery),
    enabled: Boolean(session && debouncedLocationQuery && showLocationResults),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    const normalized = locationQuery.trim()
    const timer = window.setTimeout(
      () => setDebouncedLocationQuery(normalized.length >= 2 ? normalized : ''),
      450,
    )
    return () => window.clearTimeout(timer)
  }, [locationQuery])

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        if (locationWasChosenRef.current) return
        const currentCoordinates: [number, number] = [
          coords.longitude,
          coords.latitude,
        ]
        setCoordinates(currentCoordinates)
        setLocationSource('current')
        locationPickerRef.current?.flyTo(currentCoordinates)
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8000 },
    )
  }, [])

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
        locationWasChosenRef.current = true
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

      const primaryGroupId = selectedGroupIds[0] ?? null

      return createDiscovery({
        accessToken: session.accessToken,
        groupId: primaryGroupId,
        groupIds: selectedGroupIds.filter(
          (groupId) => groupId !== primaryGroupId,
        ),
        personal: personalSelected,
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
      queryClient.invalidateQueries({
        queryKey: ['group-discoveries', session?.user.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['pois', session?.user.id],
      })
      queryClient.invalidateQueries({ queryKey: ['groups', session?.user.id] })
      navigate(discoveryPath(discovery.id, discovery.groupId), {
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

    if (!personalSelected && selectedGroupIds.length === 0) {
      setFormMessage('Select at least one destination map.')
      return
    }

    mutation.mutate()
  }

  function handleLocationChange(nextCoordinates: [number, number]) {
    locationWasChosenRef.current = true
    setCoordinates(nextCoordinates)
    setLocationSource('manual')
  }

  function handleLocationResult(
    longitude: number,
    latitude: number,
    zoom: number,
    label: string,
  ) {
    locationWasChosenRef.current = true
    const nextCoordinates: [number, number] = [longitude, latitude]
    setCoordinates(nextCoordinates)
    setLocationSource('search')
    setLocationQuery(label)
    setShowLocationResults(false)
    locationPickerRef.current?.flyTo(nextCoordinates, zoom)
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
          <DiscoveryGroupSelector
            groups={groups}
            personalMapName={personalMapName(session?.user.userName)}
            selectedGroupIds={selectedGroupIds}
            personalSelected={personalSelected}
            onPersonalChange={(selected) => {
              setSharedGroupIds(selectedGroupIds)
              setIncludePersonal(selected)
              setDestinationsTouched(true)
            }}
            onChange={(groupIds) => {
              setSharedGroupIds(groupIds)
              setIncludePersonal(personalSelected)
              setDestinationsTouched(true)
            }}
          />
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
                photoUpload.reset()
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
            {photoUpload.isPending && 'Looking for a location in the photo...'}
            {!photoUpload.isPending &&
              locationSource === 'photo' &&
              'Location detected from the photo. Tap or drag the pin to adjust it.'}
            {!photoUpload.isPending &&
              locationSource === 'current' &&
              'Current location detected. Tap or drag the pin to adjust it.'}
            {!photoUpload.isPending &&
              locationSource === 'search' &&
              'Location selected from search. Tap or drag the pin to fine-tune it.'}
            {!photoUpload.isPending &&
              locationSource !== 'photo' &&
              locationSource !== 'current' &&
              locationSource !== 'search' &&
              'Tap the map to drop a pin where this was discovered, or drag the pin to adjust it.'}
          </p>
          <div className="relative mt-3">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-ring/30">
              <Search className="size-4 text-muted-foreground" />
              <span className="sr-only">Search for a location</span>
              <input
                value={locationQuery}
                onFocus={() => setShowLocationResults(true)}
                onChange={(event) => {
                  setLocationQuery(event.target.value)
                  setShowLocationResults(true)
                }}
                placeholder="Search a country, city or place"
                className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-muted-foreground"
              />
            </label>
            {showLocationResults && locationQuery.trim().length >= 2 && (
              <div className="absolute inset-x-0 top-12 z-20 max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                {locationSearch.data?.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() =>
                      handleLocationResult(
                        result.longitude,
                        result.latitude,
                        result.zoom,
                        result.label,
                      )
                    }
                    className="block min-h-12 w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0"
                  >
                    <span className="line-clamp-2 font-medium">
                      {result.label}
                    </span>
                    <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                      {result.type.replaceAll('_', ' ')}
                    </span>
                  </button>
                ))}
                {locationSearch.isFetching && (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    Searching places…
                  </p>
                )}
                {!locationSearch.isFetching &&
                  locationSearch.data?.length === 0 && (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      No matching place found.
                    </p>
                  )}
                {locationSearch.isError && (
                  <p className="px-3 py-3 text-sm text-destructive">
                    Place search is temporarily unavailable.
                  </p>
                )}
              </div>
            )}
          </div>
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
