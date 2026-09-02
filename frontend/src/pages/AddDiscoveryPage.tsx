import { Check, ImagePlus, MapPin, Search } from 'lucide-react'
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
  type UploadPhotoResponse,
} from '@/lib/api'
import {
  canApplyAutomaticLocation,
  type LocationUiSource,
  type PersistedLocationSource,
  type SelectedLocation,
} from '@/lib/discovery-location'
import { discoveryPath } from '@/lib/discovery-path'
import { useActiveMap } from '@/hooks/useActiveMap'
import { categories, type DiscoveryCategory } from '@/lib/mock-data'
import { getStoredMapViewport } from '@/lib/map-viewport'
import { releaseNativePhoto, type SelectedPhoto } from '@/lib/photo-capture'
import { loadSession } from '@/lib/session'
import { personalMapName } from '@/lib/personal-map-name'
import { getCurrentDevicePosition } from '@/lib/device-location'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const SUPPORTED_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

type AddDiscoveryLocationState = {
  selectedPhoto?: SelectedPhoto
}

const defaultCoordinates: [number, number] = [2.3522, 48.8566]

/** Resolves whichever photo the user selected (native or browser) into bytes. */
export async function readSelectedPhoto(
  nativePhoto: SelectedPhoto | undefined,
  browserPhoto: File | null,
): Promise<{ photo: Blob; fileName: string }> {
  if (browserPhoto) {
    if (browserPhoto.size > MAX_PHOTO_BYTES) {
      throw new Error('Photo is too large.')
    }
    return { photo: browserPhoto, fileName: browserPhoto.name }
  }

  if (nativePhoto) {
    const convertedUrl = Capacitor.convertFileSrc(nativePhoto.path)
    let nativeBlob: Blob
    try {
      const response = await fetch(convertedUrl)
      if (!response.ok) throw new Error('Unable to read the selected photo.')
      nativeBlob = await response.blob()
    } catch (error) {
      if (error instanceof Error && /selected photo/i.test(error.message)) {
        throw error
      }
      throw new Error('Unable to read captured photo.', { cause: error })
    }
    if (nativeBlob.size === 0) throw new Error('Unable to read captured photo.')
    if (nativeBlob.size > MAX_PHOTO_BYTES) {
      throw new Error('Photo is too large.')
    }
    const pluginMimeType = (nativePhoto.mimeType ?? '').trim().toLowerCase()
    const blobMimeType = nativeBlob.type.trim().toLowerCase()
    const reliableMimeType = SUPPORTED_PHOTO_MIME_TYPES.has(pluginMimeType)
      ? pluginMimeType
      : nativePhoto.source === 'camera'
        ? 'image/jpeg'
        : SUPPORTED_PHOTO_MIME_TYPES.has(blobMimeType)
          ? blobMimeType
          : pluginMimeType || blobMimeType
    if (!SUPPORTED_PHOTO_MIME_TYPES.has(reliableMimeType)) {
      throw new Error('Unsupported image type.')
    }
    const photo =
      nativeBlob.type === reliableMimeType
        ? nativeBlob
        : new Blob([nativeBlob], { type: reliableMimeType })
    return { photo, fileName: nativePhoto.fileName }
  }

  throw new Error('Select a photo before saving the discovery.')
}

export function getPhotoUploadErrorMessage(error: unknown): string {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined
  const message = error instanceof Error ? error.message : ''

  if (
    status === 413 ||
    /too large|payload too large|entity too large/i.test(message)
  ) {
    return 'Photo is too large.'
  }
  if (
    status === 415 ||
    /unsupported (file|image)|unsupported.*(type|format)|mime type/i.test(
      message,
    )
  ) {
    return 'Unsupported image type.'
  }
  if (
    /unable to read|selected photo|captured photo|not a readable image/i.test(
      message,
    )
  ) {
    return 'Unable to read captured photo.'
  }
  return 'Upload failed. Please try again.'
}

export function AddDiscoveryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const session = loadSession()
  const locationPickerRef = useRef<LocationPickerMapHandle>(null)
  const photoSelectionIdRef = useRef(0)
  const isMountedRef = useRef(true)
  const selectedLocationRef = useRef<SelectedLocation | null>(null)
  const currentGpsRef = useRef<[number, number] | null>(null)

  const selectedPhoto = (location.state as AddDiscoveryLocationState | null)
    ?.selectedPhoto

  const [nativePhoto, setNativePhoto] = useState(selectedPhoto)
  const [browserPhoto, setBrowserPhoto] = useState<File | null>(null)

  const [category, setCategory] = useState<DiscoveryCategory>('other')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mapCenter] = useState<[number, number]>(
    () => getStoredMapViewport()?.center ?? defaultCoordinates,
  )
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null)
  const [locationUiSource, setLocationUiSource] =
    useState<LocationUiSource | null>(null)
  const [takenAt, setTakenAt] = useState<string | null>(null)
  const [photoSelectionId, setPhotoSelectionId] = useState(0)
  const [photoUploadState, setPhotoUploadState] = useState<{
    selectionId: number
    status: 'idle' | 'pending' | 'success' | 'error'
    data: UploadPhotoResponse | null
    error: unknown
  }>({ selectionId: 0, status: 'idle', data: null, error: null })
  const nativePhotoRef = useRef<SelectedPhoto | undefined>(undefined)
  const previousNativePhotoRef = useRef<SelectedPhoto | undefined>(nativePhoto)
  const pendingNativePhotoPathsRef = useRef(new Set<string>())
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
    nativePhotoRef.current = nativePhoto
  }, [nativePhoto])

  useEffect(() => {
    const previousPhoto = previousNativePhotoRef.current
    if (
      previousPhoto &&
      previousPhoto.path !== nativePhoto?.path &&
      !pendingNativePhotoPathsRef.current.has(previousPhoto.path)
    ) {
      void releaseNativePhoto(previousPhoto.path)
    }
    previousNativePhotoRef.current = nativePhoto
  }, [nativePhoto])

  useEffect(() => {
    const pendingNativePhotoPaths = pendingNativePhotoPathsRef.current
    return () => {
      isMountedRef.current = false
      const photo = nativePhotoRef.current
      if (photo && !pendingNativePhotoPaths.has(photo.path)) {
        void releaseNativePhoto(photo.path)
      }
    }
  }, [])

  function setSelectedDiscoveryLocation(
    nextLocation: SelectedLocation | null,
    uiSource: LocationUiSource | null = nextLocation?.source ?? null,
  ) {
    selectedLocationRef.current = nextLocation
    setSelectedLocation(nextLocation)
    setLocationUiSource(uiSource)
  }

  function applyAutomaticLocation(
    coordinates: [number, number],
    source: Exclude<PersistedLocationSource, 'manual'>,
    selectionId: number,
  ) {
    if (photoSelectionIdRef.current !== selectionId) return
    if (!canApplyAutomaticLocation(selectedLocationRef.current, source)) return

    setSelectedDiscoveryLocation(
      { coordinates, source },
      source === 'exif' ? 'photo' : 'current',
    )
    locationPickerRef.current?.flyTo(coordinates)
  }

  useEffect(() => {
    void getCurrentDevicePosition({
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 8_000,
    }).then(
      ({ coords }) => {
        const currentCoordinates: [number, number] = [
          coords.longitude,
          coords.latitude,
        ]
        currentGpsRef.current = currentCoordinates
        applyAutomaticLocation(
          currentCoordinates,
          'current_gps',
          photoSelectionIdRef.current,
        )
      },
      () => undefined,
    )
    // The callback reads mutable refs so this permission request runs once per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (currentGpsRef.current) {
      applyAutomaticLocation(
        currentGpsRef.current,
        'current_gps',
        photoSelectionId,
      )
    }
    // applyAutomaticLocation intentionally reads refs to avoid stale selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoSelectionId])

  // Uploads the photo as soon as it's selected (rather than on submit) so its
  // EXIF GPS location — if any — can propose the discovery's position before
  // the user saves, per issue #122 part 1. The result is reused at submit
  // time instead of uploading the same photo twice.
  const photoUpload = useMutation({
    mutationFn: async ({
      nativePhoto: photoToUpload,
      browserPhoto: browserPhotoToUpload,
    }: {
      selectionId: number
      nativePhoto: SelectedPhoto | undefined
      browserPhoto: File | null
    }) => {
      if (!session) throw new Error('Log in before uploading a photo.')
      const { photo, fileName } = await readSelectedPhoto(
        photoToUpload,
        browserPhotoToUpload,
      )
      return uploadPhoto(session.accessToken, photo, fileName)
    },
    onMutate: ({ selectionId, nativePhoto: photoToUpload }) => {
      if (photoToUpload) {
        pendingNativePhotoPathsRef.current.add(photoToUpload.path)
      }
      if (photoSelectionIdRef.current !== selectionId) return
      setPhotoUploadState({
        selectionId,
        status: 'pending',
        data: null,
        error: null,
      })
    },
    onSuccess: (
      uploadedPhoto,
      { selectionId, nativePhoto: photoToRelease },
    ) => {
      if (photoToRelease) {
        pendingNativePhotoPathsRef.current.delete(photoToRelease.path)
      }
      if (
        !isMountedRef.current ||
        photoSelectionIdRef.current !== selectionId
      ) {
        if (photoToRelease) void releaseNativePhoto(photoToRelease.path)
        return
      }

      setPhotoUploadState({
        selectionId,
        status: 'success',
        data: uploadedPhoto,
        error: null,
      })
      const metadata = uploadedPhoto.metadata ?? {
        location: uploadedPhoto.exif
          ? {
              latitude: uploadedPhoto.exif.latitude,
              longitude: uploadedPhoto.exif.longitude,
            }
          : null,
        takenAt: uploadedPhoto.exif?.takenAt ?? null,
      }
      setTakenAt(metadata.takenAt)
      if (metadata.location) {
        applyAutomaticLocation(
          [metadata.location.longitude, metadata.location.latitude],
          'exif',
          selectionId,
        )
      }
    },
    onError: (error, { selectionId, nativePhoto: photoToRelease }) => {
      if (photoToRelease) {
        pendingNativePhotoPathsRef.current.delete(photoToRelease.path)
      }
      if (
        !isMountedRef.current ||
        photoSelectionIdRef.current !== selectionId
      ) {
        if (photoToRelease) void releaseNativePhoto(photoToRelease.path)
        return
      }
      setPhotoUploadState({
        selectionId,
        status: 'error',
        data: null,
        error,
      })
    },
  })

  const isLoggedIn = Boolean(session)

  useEffect(() => {
    if (!isLoggedIn || !photoSelected) return
    if (nativePhoto) {
      pendingNativePhotoPathsRef.current.add(nativePhoto.path)
    }
    photoUpload.mutate({
      selectionId: photoSelectionId,
      nativePhoto,
      browserPhoto,
    })
    // Depend on isLoggedIn (a stable boolean) rather than `session` itself:
    // loadSession() returns a new object every render, which would otherwise
    // re-fire this effect — and re-upload the photo — on every state update
    // triggered by its own onSuccess handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, nativePhoto, browserPhoto, photoSelectionId])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Log in before saving a discovery.')

      const uploadedPhoto = photoUploadState.data
      if (!uploadedPhoto) {
        throw new Error('Wait for the photo to finish uploading.')
      }

      if (!selectedLocation) {
        throw new Error('Choose a real discovery location before saving.')
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
        longitude: selectedLocation.coordinates[0],
        latitude: selectedLocation.coordinates[1],
        locationSource: selectedLocation.source,
        imageObjectKey: uploadedPhoto.objectKey,
        discoveredAt: takenAt ?? new Date().toISOString(),
      })
    },
    onSuccess: (discovery) => {
      if (nativePhoto) void releaseNativePhoto(nativePhoto.path)
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
        state: { returnTo: '/', justCreated: true },
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

    const currentUpload =
      photoUploadState.selectionId === photoSelectionId
        ? photoUploadState
        : null

    if (currentUpload?.status === 'pending') {
      setFormMessage('The photo is still uploading — please wait.')
      return
    }

    if (currentUpload?.status !== 'success' || !currentUpload.data) {
      setFormMessage(getPhotoUploadErrorMessage(currentUpload?.error))
      return
    }

    if (!selectedLocation) {
      setFormMessage(
        'Choose a real discovery location on the map or search for a place before saving.',
      )
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
    setSelectedDiscoveryLocation(
      { coordinates: nextCoordinates, source: 'manual' },
      'manual',
    )
  }

  function handleLocationResult(
    longitude: number,
    latitude: number,
    zoom: number,
    label: string,
  ) {
    const nextCoordinates: [number, number] = [longitude, latitude]
    setSelectedDiscoveryLocation(
      { coordinates: nextCoordinates, source: 'manual' },
      'search',
    )
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
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/45 bg-accent text-center text-sm text-muted-foreground">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const nextSelectionId = photoSelectionIdRef.current + 1
                photoSelectionIdRef.current = nextSelectionId
                setPhotoSelectionId(nextSelectionId)
                setNativePhoto(undefined)
                setBrowserPhoto(event.target.files?.[0] ?? null)
                setSelectedDiscoveryLocation(null)
                setTakenAt(null)
                setPhotoUploadState({
                  selectionId: nextSelectionId,
                  status: 'idle',
                  data: null,
                  error: null,
                })
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
          {photoUploadState.status === 'error' && (
            <div className="mt-3 space-y-2" role="alert">
              <p className="text-sm text-destructive">
                {getPhotoUploadErrorMessage(photoUploadState.error)}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => {
                  setFormMessage('')
                  if (nativePhoto) {
                    pendingNativePhotoPathsRef.current.add(nativePhoto.path)
                  }
                  photoUpload.mutate({
                    selectionId: photoSelectionId,
                    nativePhoto,
                    browserPhoto,
                  })
                }}
              >
                Retry photo upload
              </Button>
            </div>
          )}
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
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium ${category === item.id ? 'border-primary bg-accent text-primary' : 'border-border bg-card'}`}
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
            {photoUploadState.status === 'pending' &&
              'Looking for a location in the photo...'}
            {photoUploadState.status !== 'pending' &&
              locationUiSource === 'photo' &&
              'Location detected from the photo. Tap or drag the pin to adjust it.'}
            {photoUploadState.status !== 'pending' &&
              locationUiSource === 'current' &&
              'Current location detected. Tap or drag the pin to adjust it.'}
            {photoUploadState.status !== 'pending' &&
              locationUiSource === 'search' &&
              'Location selected from search. Tap or drag the pin to fine-tune it.'}
            {photoUploadState.status !== 'pending' &&
              !selectedLocation &&
              'No real location selected yet. Tap the map to drop a pin, or search for a place before saving.'}
            {photoUploadState.status !== 'pending' &&
              selectedLocation &&
              !locationUiSource &&
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
              coordinates={selectedLocation?.coordinates ?? mapCenter}
              onChange={handleLocationChange}
              className="h-full w-full"
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {(selectedLocation?.coordinates ?? mapCenter)[1].toFixed(5)},{' '}
            {(selectedLocation?.coordinates ?? mapCenter)[0].toFixed(5)}
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
            role="alert"
            className="text-center text-sm text-destructive"
          >
            {formMessage}
          </p>
        )}
      </form>
    </main>
  )
}
