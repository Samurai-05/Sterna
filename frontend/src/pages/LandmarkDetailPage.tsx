import { MapPin, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, type SyntheticEvent } from 'react'
import { useLocation, useParams } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { getPois } from '@/lib/api'
import { getPoiImageUrl } from '@/lib/poi-image'
import { landmarks } from '@/lib/mock-data'
import { landmarkLocationLabel } from '@/lib/location-label'
import { loadSession } from '@/lib/session'

// Bounds the detail image's box to the photo's real aspect ratio instead of
// forcing a fixed 4:3 crop, while keeping extreme panoramas/portraits from
// producing an unreasonably short or tall page.
const MIN_IMAGE_RATIO = 3 / 4
const MAX_IMAGE_RATIO = 16 / 9

function clampImageRatio(width: number, height: number): number {
  if (!width || !height) return 4 / 3
  return Math.min(MAX_IMAGE_RATIO, Math.max(MIN_IMAGE_RATIO, width / height))
}

// Keyed by landmark id at the call site so navigating to a different
// landmark mounts a fresh instance — and therefore a fresh imageRatio —
// instead of carrying over the previous photo's aspect ratio.
function LandmarkHeroImage({
  imageUrl,
  alt,
  discovered,
}: {
  imageUrl: string
  alt: string
  discovered: boolean
}) {
  const [imageRatio, setImageRatio] = useState(4 / 3)

  function applyNaturalRatio(img: HTMLImageElement) {
    setImageRatio(clampImageRatio(img.naturalWidth, img.naturalHeight))
  }

  // A ref callback runs during the commit phase, before the browser paints —
  // so for an image the browser already has cached (e.g. re-opening a
  // landmark visited earlier this session), this sets the real ratio before
  // the 4:3 fallback is ever shown, avoiding a layout jump. `onLoad` remains
  // as the fallback for a genuine first load, where some jump is unavoidable
  // without knowing the photo's dimensions ahead of time.
  function handleImageRef(img: HTMLImageElement | null) {
    if (img?.complete && img.naturalWidth && img.naturalHeight) {
      applyNaturalRatio(img)
    }
  }

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    applyNaturalRatio(event.currentTarget)
  }

  return (
    <div
      style={{ aspectRatio: imageRatio }}
      className={`relative w-full overflow-hidden rounded-2xl bg-stone-200 ${discovered ? '' : 'grayscale'}`}
    >
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full scale-110 object-cover opacity-55 blur-xl"
      />
      <img
        ref={handleImageRef}
        src={imageUrl}
        alt={alt}
        onLoad={handleImageLoad}
        className={`relative size-full object-cover ${discovered ? '' : 'opacity-70'}`}
      />
    </div>
  )
}

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
        <LandmarkHeroImage
          key={landmark.id}
          imageUrl={landmarkImage}
          alt={landmark.name}
          discovered={landmark.discovered}
        />
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
          {landmarkLocationLabel(landmark)}
        </p>
        <p className="mt-6 text-[16px] leading-6">{landmark.description}</p>
      </article>
    </main>
  )
}
