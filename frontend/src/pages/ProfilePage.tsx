import { Award, Camera, Globe2, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryCard } from '@/components/DiscoveryCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ApiError,
  getCurrentUser,
  getDiscoveries,
  getGroupDiscoveries,
  getPois,
} from '@/lib/api'
import { activeMapName, useActiveMap } from '@/hooks/useActiveMap'
import { getCountryName } from '@/lib/countries'
import {
  categories,
  discoveries,
  landmarks,
  type DiscoveryCategory,
} from '@/lib/mock-data'
import { clearSession, loadSession, saveSession } from '@/lib/session'

const categoryVisuals: Record<
  DiscoveryCategory,
  { icon: string; background: string; indicator: string }
> = {
  landscape: {
    icon: 'text-[#2F6B8A]',
    background: 'bg-[#EAF3F7]',
    indicator: 'bg-[#2F6B8A]',
  },
  monument: {
    icon: 'text-[#7E6552]',
    background: 'bg-[#F1E9E4]',
    indicator: 'bg-[#7E6552]',
  },
  food: {
    icon: 'text-[#B8572B]',
    background: 'bg-[#FBF1EC]',
    indicator: 'bg-[#B8572B]',
  },
  animal: {
    icon: 'text-[#3F7A78]',
    background: 'bg-[#E8F2F1]',
    indicator: 'bg-[#3F7A78]',
  },
  plant: {
    icon: 'text-[#3F724E]',
    background: 'bg-[#F0F7F3]',
    indicator: 'bg-[#3F724E]',
  },
  culture: {
    icon: 'text-[#756B8F]',
    background: 'bg-[#F1EEF7]',
    indicator: 'bg-[#756B8F]',
  },
  other: {
    icon: 'text-[#9C7A32]',
    background: 'bg-[#FBF4E2]',
    indicator: 'bg-[#9C7A32]',
  },
}

export function ProfilePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => loadSession())
  const accessToken = session?.accessToken
  const {
    data: activeMap,
    isError: isActiveMapError,
    isPending: isLoadingActiveMap,
  } = useActiveMap()
  const activeGroupId = activeMap?.groupId ?? null

  const { data: currentUser, error: currentUserError } = useQuery({
    queryKey: ['current-user', session?.accessToken],
    queryFn: () => getCurrentUser(accessToken!),
    enabled: Boolean(accessToken),
  })
  const { data: backendDiscoveries, isError: isDiscoveriesError } = useQuery({
    queryKey: activeGroupId
      ? ['group-discoveries', session?.user.id, activeGroupId]
      : ['discoveries', session?.user.id],
    queryFn: () =>
      activeGroupId
        ? getGroupDiscoveries(accessToken!, activeGroupId)
        : getDiscoveries(accessToken!),
    enabled: Boolean(accessToken) && !isLoadingActiveMap,
  })
  const { data: backendPois, isError: isPoisError } = useQuery({
    queryKey: ['pois', session?.user.id],
    queryFn: () => getPois(accessToken!),
    enabled: Boolean(accessToken) && !isLoadingActiveMap,
  })

  const sourceDiscoveries =
    backendDiscoveries ??
    (isDiscoveriesError && activeGroupId === null ? discoveries : [])
  const sourceLandmarks =
    backendPois ??
    (isPoisError && (activeGroupId === null || isActiveMapError)
      ? landmarks
      : [])
  const displayedUser = currentUser ?? session?.user
  const displayedUserName = displayedUser?.userName ?? ''
  const displayedInitial = displayedUserName.trim().charAt(0).toUpperCase()
  const memberSinceYear = displayedUser
    ? new Date(displayedUser.createdAt).getFullYear()
    : null

  const discoveredLandmarks = sourceLandmarks.filter(
    (landmark) => landmark.discovered,
  )
  const exploredCountries = [
    ...new Set(
      sourceDiscoveries
        .map((discovery) => getCountryName(discovery.countryCode))
        .filter((country): country is string => Boolean(country)),
    ),
  ]
  const categoryCounts = categories
    .map((category) => ({
      ...category,
      count: sourceDiscoveries.filter(
        (discovery) => discovery.category === category.id,
      ).length,
    }))
    .filter((category) => category.count > 0)
  const highestCategoryCount = Math.max(
    ...categoryCounts.map((category) => category.count),
    1,
  )
  const progress = sourceLandmarks.length
    ? (discoveredLandmarks.length / sourceLandmarks.length) * 100
    : 0

  useEffect(() => {
    if (!accessToken || !currentUser) return

    const nextSession = { accessToken, user: currentUser }
    saveSession(nextSession)
  }, [accessToken, currentUser])

  useEffect(() => {
    if (
      currentUserError instanceof ApiError &&
      currentUserError.status === 401
    ) {
      clearSession()
      navigate('/auth', { replace: true })
    }
  }, [currentUserError, navigate])

  function handleLogout() {
    clearSession()
    setSession(null)
    navigate('/auth', { replace: true })
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="bg-[linear-gradient(150deg,#1D3B28_0%,#2D5A3D_100%)] text-primary-foreground">
        <section
          className="sterna-profile-hero px-5 pb-8"
          aria-label="Profile overview"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-[26px] font-semibold leading-8">
                {displayedUserName}
              </h2>
              <p className="mt-2 font-sans text-sm leading-5 text-primary-foreground/70">
                Explorer · Since {memberSinceYear}
              </p>
              <p className="mt-1 text-xs font-semibold text-primary-foreground/85">
                {activeMapName(activeMap)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Open account settings"
              className="flex size-[68px] shrink-0 -translate-x-2.5 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-[#C4622D] font-display text-[26px] font-semibold text-primary-foreground shadow-sm outline-none transition-transform focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95"
            >
              <span aria-hidden="true">{displayedInitial}</span>
            </button>
          </div>
          <div
            className="mt-5 grid grid-cols-3 border-t border-white/20 pt-4 text-center"
            aria-label="Exploration statistics"
          >
            <Stat
              icon={<Camera />}
              value={sourceDiscoveries.length}
              label="Discoveries"
              inverse
              separator={false}
            />
            <Stat
              icon={<Globe2 />}
              value={exploredCountries.length}
              label="Countries"
              inverse
              separator
            />
            <Stat
              icon={<Trophy />}
              value={discoveredLandmarks.length}
              label="POIs"
              inverse
              separator
            />
          </div>
        </section>
      </div>
      <div className="-mt-6 space-y-8 rounded-t-3xl bg-card px-5 pb-2 pt-8">
        <section>
          {session ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={handleLogout}
            >
              Log out
            </Button>
          ) : (
            <Button asChild className="h-11 w-full">
              <Link to="/login">Log in</Link>
            </Button>
          )}
        </section>
        <section aria-labelledby="recent-discoveries-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="recent-discoveries-heading"
              className="font-display text-[22px] font-semibold leading-7"
            >
              Recent
            </h2>
            <Link
              to="/collection"
              className="flex min-h-11 items-center text-sm font-semibold text-primary"
            >
              See all
            </Link>
          </div>
          <div className="-mr-5 flex snap-x gap-3 overflow-x-auto pb-2 pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sourceDiscoveries.slice(0, 3).map((discovery) => (
              <DiscoveryCard
                key={discovery.id}
                discovery={discovery}
                groupId={activeGroupId ?? undefined}
                className="w-[min(80vw,20rem)] shrink-0 snap-start"
              />
            ))}
          </div>
        </section>
        <section
          className="rounded-2xl border border-border bg-background p-4 shadow-sm"
          aria-labelledby="exploration-progress-heading"
        >
          <h2
            id="exploration-progress-heading"
            className="flex items-center gap-2 text-[15px] font-semibold leading-5"
          >
            <Award className="size-5 text-primary" aria-hidden="true" />
            Exploration progress
          </h2>
          <Progress
            className="mt-3"
            value={progress}
            aria-label="Point of interest exploration progress"
            aria-valuetext={`${discoveredLandmarks.length} of ${sourceLandmarks.length} points of interest discovered`}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            {discoveredLandmarks.length} / {sourceLandmarks.length} points of
            interest discovered
          </p>
        </section>
        <section aria-labelledby="countries-explored-heading">
          <h2
            id="countries-explored-heading"
            className="font-display text-[22px] font-semibold leading-7"
          >
            Countries explored
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {exploredCountries.map((country) => (
              <span
                key={country}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium leading-4"
              >
                {country}
              </span>
            ))}
          </div>
        </section>
        <section
          className="pb-2"
          aria-labelledby="discoveries-by-category-heading"
        >
          <h2
            id="discoveries-by-category-heading"
            className="font-sans text-lg font-semibold leading-6"
          >
            Discoveries by category
          </h2>
          <div className="mt-4 space-y-4">
            {categoryCounts.map((category) => {
              const visual = categoryVisuals[category.id]

              return (
                <div
                  key={category.id}
                  className="grid grid-cols-[36px_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-3 gap-y-1"
                >
                  <span
                    className={`row-span-2 flex size-9 shrink-0 items-center justify-center self-start rounded-xl ${visual.background}`}
                    aria-hidden="true"
                  >
                    <CategoryIcon
                      category={category.id}
                      className={`size-4 ${visual.icon}`}
                    />
                  </span>
                  <span className="min-w-0 truncate text-sm font-semibold leading-5">
                    {category.label}
                  </span>
                  <span className="text-sm font-semibold leading-5 tabular-nums text-muted-foreground">
                    {category.count}
                  </span>
                  <Progress
                    value={(category.count / highestCategoryCount) * 100}
                    aria-label={`${category.label} discoveries: ${category.count}`}
                    aria-valuetext={`${category.count} ${category.count === 1 ? 'discovery' : 'discoveries'} in ${category.label}`}
                    indicatorClassName={visual.indicator}
                    className="col-span-2 bg-[#E7E5E0]"
                  />
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function Stat({
  icon,
  value,
  label,
  inverse = false,
  separator = false,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  inverse?: boolean
  separator?: boolean
}) {
  return (
    <div
      className={`relative px-2 ${separator ? 'before:absolute before:left-0 before:top-1/2 before:h-10 before:w-px before:-translate-y-1/2 before:bg-white/15' : ''}`}
    >
      <span
        className={`mx-auto mb-1 flex size-6 items-center justify-center [&>svg]:size-5 ${inverse ? 'text-primary-foreground/80' : 'text-primary'}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <strong
        className={`block font-sans text-2xl font-bold leading-7 ${inverse ? 'text-primary-foreground' : 'text-foreground'}`}
      >
        {value}
      </strong>
      <span
        className={`font-sans text-xs font-medium leading-4 ${inverse ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </div>
  )
}
