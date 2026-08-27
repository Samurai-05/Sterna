import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { getDiscovery, updateDiscovery } from '@/lib/api'
import {
  categories,
  type Discovery,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import { loadSession } from '@/lib/session'
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
  returnTo,
}: {
  discovery: Discovery
  discoveryId: string
  accessToken: string
  userId: string
  returnTo: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(discovery.name)
  const [description, setDescription] = useState(discovery.description)
  const [category, setCategory] = useState<DiscoveryCategory>(
    discovery.category,
  )
  const [longitude, setLongitude] = useState(String(discovery.coordinates[0]))
  const [latitude, setLatitude] = useState(String(discovery.coordinates[1]))
  const [formMessage, setFormMessage] = useState('')

  const mutation = useMutation({
    mutationFn: updateDiscovery,
    onSuccess: (updatedDiscovery) => {
      queryClient.setQueryData(
        ['discovery', userId, discoveryId],
        updatedDiscovery,
      )
      queryClient.invalidateQueries({ queryKey: ['discoveries', userId] })
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
            longitude: Number(longitude),
            latitude: Number(latitude),
          })
        }}
        className="space-y-6 px-5"
      >
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
        <label className="block space-y-2 text-sm font-semibold">
          Category
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as DiscoveryCategory)
            }
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <CoordinateInput
            label="Longitude"
            value={longitude}
            min={-180}
            max={180}
            onChange={setLongitude}
          />
          <CoordinateInput
            label="Latitude"
            value={latitude}
            min={-90}
            max={90}
            onChange={setLatitude}
          />
        </div>
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

function CoordinateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  min: number
  max: number
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      {label}
      <input
        required
        type="number"
        step="any"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  )
}
