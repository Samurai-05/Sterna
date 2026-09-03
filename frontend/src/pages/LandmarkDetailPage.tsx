import { Camera, MapPin, Trophy } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type SyntheticEvent } from 'react'
import { useLocation, useParams } from 'react-router'

import { ConfirmPoiLinkDrawer } from '@/components/ConfirmPoiLinkDrawer'
import { DiscoveryPhoto } from '@/components/DiscoveryPhoto'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { confirmDiscoveryPoi, getAuthoredDiscoveries, getPois } from '@/lib/api'
import { distanceInKilometres, formatDistance } from '@/lib/distance'
import { getPoiImageUrl } from '@/lib/poi-image'
import { landmarks, type Discovery } from '@/lib/mock-data'
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
  const queryClient = useQueryClient()
  const [linkableDiscoveries, setLinkableDiscoveries] = useState<
    Discovery[] | null
  >(null)
  const [isLoadingLinkables, setIsLoadingLinkables] = useState(false)
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

  const confirmPoiLink = useMutation({
    mutationFn: (discoveryId: string) =>
      confirmDiscoveryPoi(session!.accessToken, discoveryId, landmark!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pois', session?.user.id] })
      setLinkableDiscoveries(null)
    },
  })

  if (!landmark) return null

  async function handleFindExistingPhoto() {
    if (!session) return
    setIsLoadingLinkables(true)
    try {
      const discoveries = await getAuthoredDiscoveries(session.accessToken)
      setLinkableDiscoveries(
        [...discoveries].sort(
          (left, right) =>
            distanceInKilometres(landmark!.coordinates, left.coordinates) -
            distanceInKilometres(landmark!.coordinates, right.coordinates),
        ),
      )
    } catch {
      // Leave the button available so the user can retry.
    } finally {
      setIsLoadingLinkables(false)
    }
  }

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
        {!landmark.discovered && session && (
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10 w-full"
            disabled={isLoadingLinkables}
            onClick={handleFindExistingPhoto}
          >
            <Camera className="size-4" />
            {isLoadingLinkables
              ? 'Looking for photos...'
              : 'I already have a photo of this'}
          </Button>
        )}
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-9">
          {landmark.name}
        </h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 text-primary" />
          {landmarkLocationLabel(landmark)}
        </p>
        <p className="mt-6 text-[16px] leading-6">{landmark.description}</p>
      </article>
      <ConfirmPoiLinkDrawer
        open={linkableDiscoveries !== null}
        title={`Is this ${landmark.name}?`}
        description="Pick the discovery that's a photo of this point of interest."
        emptyMessage="You don't have any discoveries yet."
        items={(linkableDiscoveries ?? []).map((discovery) => ({
          id: String(discovery.id),
          title: discovery.name,
          subtitle: formatDistance(
            distanceInKilometres(landmark.coordinates, discovery.coordinates),
          ),
          thumbnail: (
            <DiscoveryPhoto
              discovery={discovery}
              alt=""
              variant="card"
              className="size-full object-cover"
            />
          ),
        }))}
        onPick={(discoveryId) => confirmPoiLink.mutate(discoveryId)}
        onDismiss={() => setLinkableDiscoveries(null)}
      />
    </main>
  )
}
