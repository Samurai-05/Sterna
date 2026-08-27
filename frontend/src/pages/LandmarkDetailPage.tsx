import { MapPin, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { imageUrl, landmarks } from '@/lib/mock-data'
import { getPois } from '@/lib/api'
import { loadSession } from '@/lib/session'

export function LandmarkDetailPage() {
  const { landmarkId } = useParams()
  const session = loadSession()
  const { data: backendPois } = useQuery({
    queryKey: ['pois', session?.user.id],
    queryFn: () => getPois(session!.accessToken),
    enabled: Boolean(session),
  })
  const sourceLandmarks = backendPois ?? landmarks
  const landmark =
    sourceLandmarks.find((item) => item.id === landmarkId) ?? sourceLandmarks[0]
  if (!landmark) return null
  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Point of interest" backTo="/" />
      <article className="px-5">
        <img
          src={landmark.imageUrl ?? imageUrl(landmark.imageId)}
          alt={landmark.name}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
        <div className={`mt-5 flex items-center gap-2 text-sm font-semibold ${landmark.discovered ? 'text-[#b8572b]' : 'text-muted-foreground'}`}>
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
