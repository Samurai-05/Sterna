import { CalendarDays, MapPin, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { deleteDiscovery, getDiscovery, getGroupDiscoveries } from '@/lib/api'
import { categoryLabel } from '@/lib/mock-data'
import { discoveryLocationLabel } from '@/lib/location-label'
import { getDiscoveryRouteState } from '@/lib/route-state'
import { loadSession } from '@/lib/session'

type DiscoveryDetailPageProps = {
  presentation?: 'page' | 'overlay'
}

export function DiscoveryDetailPage({
  presentation = 'page',
}: DiscoveryDetailPageProps) {
  const { discoveryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const session = loadSession()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // Set when the discovery was opened from a group's shared map, where it may
  // belong to another member.
  const groupId = searchParams.get('group')
  const routeState = getDiscoveryRouteState(location.state)
  const returnTo = routeState.returnTo ?? '/collection'
  const handleBack = () => {
    if (routeState.backgroundLocation) {
      navigate(-1)
      return
    }

    navigate(returnTo, { replace: true })
  }
  const pageClassName =
    presentation === 'overlay'
      ? 'fixed inset-0 z-50 h-dvh overflow-y-auto bg-background pb-8'
      : 'min-h-dvh bg-background pb-8'

  const personalQuery = useQuery({
    queryKey: ['discovery', session?.user.id, discoveryId],
    queryFn: () => getDiscovery(session!.accessToken, discoveryId!),
    enabled: Boolean(session && discoveryId && !groupId),
  })

  // Shares its cache with the group map, so opening a card is usually instant.
  const groupQuery = useQuery({
    queryKey: ['group-discoveries', session?.user.id, groupId],
    queryFn: () => getGroupDiscoveries(session!.accessToken, groupId!),
    select: (items) =>
      items.find((item) => String(item.id) === discoveryId) ?? null,
    enabled: Boolean(session && discoveryId && groupId),
  })

  const discovery = groupId ? groupQuery.data : personalQuery.data
  const isLoading = groupId ? groupQuery.isLoading : personalQuery.isLoading
  const deleteMutation = useMutation({
    mutationFn: () => deleteDiscovery(session!.accessToken, discoveryId!),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ['discovery', session?.user.id, discoveryId],
      })
      queryClient.invalidateQueries({
        queryKey: ['discoveries', session?.user.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['group-discoveries', session?.user.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['pois', session?.user.id],
      })
      handleBack()
    },
  })

  if (isLoading) {
    return (
      <main className={pageClassName}>
        <PageHeader title="Discovery" onBack={handleBack} />
        <div className="px-5 text-sm text-muted-foreground">Loading...</div>
      </main>
    )
  }

  if (!discovery) {
    return (
      <main className={pageClassName}>
        <PageHeader title="Discovery" onBack={handleBack} />
        <div className="px-5 text-sm text-muted-foreground">
          Discovery not found.
        </div>
      </main>
    )
  }

  // The sample fixtures carry no userId; treat those as the viewer's own.
  const isAuthor =
    discovery.userId === undefined || discovery.userId === session?.user.id

  return (
    <main className={pageClassName}>
      <PageHeader title="Discovery" onBack={handleBack} />
      <article className="px-5">
        <DiscoveryPhoto
          discovery={discovery}
          alt={discovery.name}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
        <div className="mt-5 flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <CategoryIcon category={discovery.category} className="size-4" />
              {categoryLabel(discovery.category)}
            </p>
            <h1 className="font-display text-[30px] font-semibold leading-9">
              {discovery.name}
            </h1>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbf1ec] text-[#b8572b]">
            {discovery.initials}
          </span>
        </div>
        <div className="mt-5 space-y-3 text-sm text-muted-foreground">
          <p className="flex gap-2">
            <MapPin className="size-4 shrink-0 text-primary" />
            {discoveryLocationLabel(discovery)}
          </p>
          <p className="flex gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            Added by {discovery.author} · {discovery.relativeDate}
          </p>
        </div>
        <p className="mt-6 text-[16px] leading-6 text-foreground">
          {discovery.description}
        </p>
        {isAuthor ? (
          <>
            <Button asChild variant="outline" className="mt-6 h-11 w-full">
              <Link
                to={`/discoveries/${discovery.id}/edit`}
                state={{ returnTo }}
              >
                Edit discovery
              </Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              className="mt-3 h-11 w-full"
              onClick={() => {
                if (window.confirm('Delete this discovery permanently?')) {
                  deleteMutation.mutate()
                }
              }}
            >
              <Trash2 />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete discovery'}
            </Button>
            {deleteMutation.isError && (
              <p role="status" className="mt-3 text-sm text-destructive">
                Unable to delete discovery.
              </p>
            )}
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Only {discovery.author} can edit or delete this discovery.
          </p>
        )}
      </article>
    </main>
  )
}
