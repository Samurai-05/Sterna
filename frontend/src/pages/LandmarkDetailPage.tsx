import { MapPin, Trophy } from 'lucide-react'
import { useParams } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { imageUrl, landmarks } from '@/lib/mock-data'

export function LandmarkDetailPage() {
  const { landmarkId } = useParams()
  const landmark =
    landmarks.find((item) => item.id === landmarkId) ?? landmarks[0]
  return (
    <main className="min-h-dvh bg-background">
      <PageHeader title="Point of interest" backTo="/" />
      <article className="px-5">
        <img
          src={imageUrl(landmark.imageId)}
          alt={landmark.name}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#b8572b]">
          <Trophy className="size-4" />
          Discovered
        </div>
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-9">
          {landmark.name}
        </h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 text-primary" />
          {landmark.city}, {landmark.country}
        </p>
        <p className="mt-6 text-[16px] leading-6">{landmark.description}</p>
      </article>
    </main>
  )
}
