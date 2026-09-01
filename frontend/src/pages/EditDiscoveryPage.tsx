import { MapPin, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { PageHeader } from '@/components/PageHeader'
import { DiscoveryGroupSelector } from '@/components/DiscoveryGroupSelector'
import {
  LocationPickerMap,
  type LocationPickerMapHandle,
} from '@/components/LocationPickerMap'
import { Button } from '@/components/ui/button'
import {
  getDiscovery,
  getGroups,
  searchLocations,
  updateDiscovery,
} from '@/lib/api'
import {
  categories,
  type Discovery,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import { loadSession } from '@/lib/session'
import { personalMapName } from '@/lib/personal-map-name'
import { getDiscoveryRouteState } from '@/lib/route-state'

export function EditDiscoveryPage() {
  const { discoveryId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = loadSession()
  const returnTo =
    getDiscoveryRouteState(location.state).returnTo ?? '/collection'
  const { data: discovery, isLoading } = useQuery({
    queryKey: ['discovery', session?.user.id, discoveryId],
    queryFn: () => getDiscovery(session!.accessToken, discoveryId!),
    enabled: Boolean(session && discoveryId),
  })

  const handleBack = () => {
    if (!discoveryId) {
      navigate(returnTo, { replace: true })
      return
    }

    navigate(`/discoveries/${discoveryId}`, {
      state: { returnTo },
      replace: true,
    })
  }

  if (isLoading) {
    return <EditPageMessage message="Loading..." onBack={handleBack} />
  }
  if (!discovery || !session || !discoveryId) {
    return (
      <EditPageMessage message="Discovery not found." onBack={handleBack} />
    )
  }

  return (
    <EditDiscoveryForm
      key={discovery.id}
      discovery={discovery}
      discoveryId={discoveryId}
      accessToken={session.accessToken}
      userId={session.user.id}
      userName={session.user.userName}
      returnTo={returnTo}
    />
  )
}

function EditPageMessage({
  message,
  onBack,
}: {
  message: string
  onBack: () => void
}) {
  return (
    <main className="min-h-dvh bg-background pb-8">
      <PageHeader title="Edit discovery" onBack={onBack} />
      <div className="px-5 text-sm text-muted-foreground">{message}</div>
    </main>
  )
}

function EditDiscoveryForm({
  discovery,
  discoveryId,
  accessToken,
  userId,
  userName,
  returnTo,
}: {
  discovery: Discovery
  discoveryId: string
  accessToken: string
  userId: string
  userName: string
  returnTo: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locationPickerRef = useRef<LocationPickerMapHandle>(null)
  const [title, setTitle] = useState(discovery.name)
  const [description, setDescription] = useState(discovery.description)
  const [category, setCategory] = useState<DiscoveryCategory>(
    discovery.category,
  )
  const [coordinates, setCoordinates] = useState<[number, number]>(
    discovery.coordinates,
  )
  const [locationQuery, setLocationQuery] = useState('')
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState('')
  const [showLocationResults, setShowLocationResults] = useState(false)
  const [locationWasSearched, setLocationWasSearched] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [sharedGroupIds, setSharedGroupIds] = useState(discovery.groupIds ?? [])
  const [includePersonal, setIncludePersonal] = useState(
    discovery.personal ?? discovery.groupId === null,
  )
  const { data: groups } = useQuery({
    queryKey: ['groups', userId],
    queryFn: () => getGroups(accessToken),
  })
  const locationSearch = useQuery({
    queryKey: [
      'edit-discovery-location-search',
      discoveryId,
      debouncedLocationQuery,
    ],
    queryFn: () => searchLocations(accessToken, debouncedLocationQuery),
    enabled: Boolean(debouncedLocationQuery && showLocationResults),
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

  const mutation = useMutation({
    mutationFn: updateDiscovery,
    onSuccess: (updatedDiscovery) => {
      queryClient.setQueryData(
        ['discovery', userId, discoveryId],
        updatedDiscovery,
      )
      queryClient.invalidateQueries({ queryKey: ['discoveries', userId] })
      queryClient.invalidateQueries({ queryKey: ['group-discoveries', userId] })
      queryClient.invalidateQueries({ queryKey: ['pois', userId] })
      queryClient.invalidateQueries({ queryKey: ['groups', userId] })
      navigate(`/discoveries/${updatedDiscovery.id}`, {
        state: { returnTo },
        replace: true,
      })
    },
    onError: (error) => {
      setFormMessage(
        error instanceof Error ? error.message : 'Unable to update discovery.',
      )
    },
  })

  return (
    <main className="min-h-dvh bg-background">
      <PageHeader
        title="Edit discovery"
        onBack={() =>
          navigate(`/discoveries/${discovery.id}`, {
            state: { returnTo },
            replace: true,
          })
        }
      />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setFormMessage('')
          mutation.mutate({
            accessToken,
            discoveryId,
            title,
            description: description.trim() || null,
            category,
            longitude: coordinates[0],
            latitude: coordinates[1],
            groupIds: sharedGroupIds,
            personal: includePersonal,
          })
        }}
        className="space-y-6 px-5"
      >
        <section className="rounded-2xl border border-border bg-card p-4">
          <DiscoveryGroupSelector
            groups={groups}
            personalMapName={personalMapName(userName)}
            selectedGroupIds={sharedGroupIds}
            personalSelected={includePersonal}
            onPersonalChange={setIncludePersonal}
            onChange={setSharedGroupIds}
          />
        </section>
        <label className="block space-y-2 text-sm font-semibold">
          Title
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
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
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium ${category === item.id ? 'border-primary bg-green-50 text-primary' : 'border-border bg-card'}`}
              >
                <CategoryIcon category={item.id} className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-primary" />
            Location
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {locationWasSearched
              ? 'Location selected from search. Tap or drag the pin to fine-tune it.'
              : 'Search for a place, tap the map or drag the pin to update the location.'}
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
                    onClick={() => {
                      const nextCoordinates: [number, number] = [
                        result.longitude,
                        result.latitude,
                      ]
                      setCoordinates(nextCoordinates)
                      setLocationWasSearched(true)
                      setLocationQuery(result.label)
                      setShowLocationResults(false)
                      locationPickerRef.current?.flyTo(
                        nextCoordinates,
                        result.zoom,
                      )
                    }}
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
              onChange={(nextCoordinates) => {
                setCoordinates(nextCoordinates)
                setLocationWasSearched(false)
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
          disabled={mutation.isPending}
          className="h-12 w-full"
        >
          {mutation.isPending ? 'Saving...' : 'Save changes'}
        </Button>
        {formMessage && (
          <p role="status" className="text-center text-sm text-destructive">
            {formMessage}
          </p>
        )}
      </form>
    </main>
  )
}
