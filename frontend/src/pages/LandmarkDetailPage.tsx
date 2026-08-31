import { MapPin, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useParams } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { getPois } from '@/lib/api'
import { getPoiImageUrl } from '@/lib/poi-image'
import { landmarks } from '@/lib/mock-data'
import { loadSession } from '@/lib/session'

export function LandmarkDetailPage() {
  const { landmarkId } = useParams()
  const location = useLocation()
  const session = loadSession()
  const { data: backendPois } = useQuery({
    queryKey: ['pois', session?.user.id],
    queryFn: () => getPois(session!.accessToken),
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  })
  const sourceLandmarks = backendPois ?? (session ? [] : landmarks)
  const landmark =
    sourceLandmarks.find((item) => item.id === landmarkId) ?? sourceLandmarks[0]
  const returnTo =
    typeof location.state?.returnTo === 'string' ? location.state.returnTo : '/'
  if (!landmark) return null
  const landmarkImage = getPoiImageUrl(
    landmark.imageUrl,
    landmark.imageId,
    'detail',
  )
  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Point of interest" backTo={returnTo} />
      <article className="px-5">
        <div
          className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone-200 ${landmark.discovered ? '' : 'grayscale'}`}
        >
          <img
            src={landmarkImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full scale-110 object-cover opacity-55 blur-xl"
          />
          <img
            src={landmarkImage}
            alt={landmark.name}
            className={`relative size-full object-contain ${landmark.discovered ? '' : 'opacity-70'}`}
          />
        </div>
        <div
          className={`mt-5 flex items-center gap-2 text-sm font-semibold ${landmark.discovered ? 'text-[#A16207]' : 'text-muted-foreground'}`}
        >
          <Trophy className="size-4" />
          {landmark.discovered ? 'Discovered' : 'Undiscovered'}
        </div>
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-9">
          {landmark.name}
        </h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 text-primary" />
          {landmark.city && landmark.country
            ? `${landmark.city}, ${landmark.country}`
            : `${landmark.coordinates[1].toFixed(5)}, ${landmark.coordinates[0].toFixed(5)}`}
        </p>
        <p className="mt-6 text-[16px] leading-6">{landmark.description}</p>
      </article>
    </main>
  )
}
