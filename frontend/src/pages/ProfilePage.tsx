import { Award, Check, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryCard } from '@/components/DiscoveryCard'
import { Progress } from '@/components/ui/progress'
import { ApiError, getCurrentUser, getDiscoveries, getPois } from '@/lib/api'
import { categoryAppearance } from '@/lib/category-appearance'
import { getCountryName } from '@/lib/countries'
import { categories, discoveries, landmarks } from '@/lib/mock-data'
import { clearSession, loadSession, saveSession } from '@/lib/session'

export function ProfilePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => loadSession())
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
  const accessToken = session?.accessToken

  const { data: currentUser, error: currentUserError } = useQuery({
    queryKey: ['current-user', session?.accessToken],
    queryFn: () => getCurrentUser(accessToken!),
    enabled: Boolean(accessToken),
  })
  const { data: backendDiscoveries } = useQuery({
    queryKey: ['discoveries', session?.user.id],
    queryFn: () => getDiscoveries(accessToken!),
    enabled: Boolean(accessToken),
  })
  const { data: backendPois } = useQuery({
    queryKey: ['pois', session?.user.id],
    queryFn: () => getPois(accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60 * 1000,
  })

  const sourceDiscoveries = backendDiscoveries ?? (session ? [] : discoveries)
  const sourceLandmarks = backendPois ?? landmarks
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
  const categoryTotal = categoryCounts.reduce(
    (total, category) => total + category.count,
    0,
  )
  const chartCircumference = 2 * Math.PI * 48
  const categoryChartSegments = categoryCounts.map((category, index) => {
    const length = categoryTotal
      ? (category.count / categoryTotal) * chartCircumference
      : 0
    const offset = categoryCounts
      .slice(0, index)
      .reduce(
        (total, previousCategory) =>
          total +
          (categoryTotal
            ? (previousCategory.count / categoryTotal) * chartCircumference
            : 0),
        0,
      )
    return { ...category, length, offset }
  })
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

  useEffect(() => {
    if (!isAccountSheetOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function closeAccountSheetWithKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsAccountSheetOpen(false)
    }

    document.addEventListener('keydown', closeAccountSheetWithKeyboard)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeAccountSheetWithKeyboard)
    }
  }, [isAccountSheetOpen])

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
            </div>
            <div className="shrink-0">
              <button
                type="button"
                aria-label="Open account settings"
                aria-expanded={isAccountSheetOpen}
                aria-controls="profile-account-sheet"
                onClick={() => setIsAccountSheetOpen(true)}
                className="flex size-14 -translate-x-2.5 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-[#C4622D] font-display text-[22px] font-semibold text-primary-foreground shadow-sm outline-none transition-transform focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95"
              >
                <span aria-hidden="true">{displayedInitial}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
      <div className="-mt-6 space-y-8 rounded-t-3xl bg-card px-5 pb-2 pt-8">
        <section aria-labelledby="pois-heading">
          <h2
            id="pois-heading"
            className="font-display text-[22px] font-semibold leading-7"
          >
            POIs
          </h2>
          <div className="mt-3 rounded-2xl border border-border bg-background p-4 shadow-sm">
            <p className="flex items-center gap-2 text-[15px] font-semibold leading-5">
              <Award className="size-5 text-primary" aria-hidden="true" />
              Exploration progress
            </p>
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
          </div>
        </section>
        <section aria-labelledby="discoveries-by-category-heading">
          <h2
            id="discoveries-by-category-heading"
            className="font-display text-[22px] font-semibold leading-7"
          >
            Discoveries by category
          </h2>
          <div className="mt-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
            <svg
              viewBox="0 0 128 128"
              role="img"
              aria-label="Distribution of discoveries by category"
              className="mx-auto size-44 max-w-full"
            >
              <circle
                cx="64"
                cy="64"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                className="text-border/70"
              />
              {categoryChartSegments.map((category) => (
                <circle
                  key={category.id}
                  cx="64"
                  cy="64"
                  r="48"
                  fill="none"
                  stroke={categoryAppearance[category.id].color}
                  strokeWidth="16"
                  strokeDasharray={`${category.length} ${chartCircumference - category.length}`}
                  strokeDashoffset={-category.offset}
                  transform="rotate(-90 64 64)"
                >
                  <title>
                    {category.label}: {category.count}{' '}
                    {category.count === 1 ? 'discovery' : 'discoveries'}
                  </title>
                </circle>
              ))}
              <text
                x="64"
                y="61"
                textAnchor="middle"
                className="fill-foreground text-[22px] font-bold"
              >
                {categoryTotal}
              </text>
              <text
                x="64"
                y="78"
                textAnchor="middle"
                className="fill-muted-foreground text-[9px] font-medium"
              >
                discoveries
              </text>
            </svg>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryCounts.map((category) => {
                const appearance = categoryAppearance[category.id]
                const discoveryLabel =
                  category.count === 1 ? 'discovery' : 'discoveries'
                const percentage = categoryTotal
                  ? Math.round((category.count / categoryTotal) * 100)
                  : 0

                return (
                  <div
                    key={category.id}
                    aria-label={`${category.label}: ${category.count} ${discoveryLabel}`}
                    className="flex min-w-0 items-center gap-2 rounded-xl bg-card p-2"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${appearance.background}`}
                      aria-hidden="true"
                    >
                      <CategoryIcon category={category.id} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold leading-5">
                        {category.label}
                      </span>
                      <span className="block text-xs leading-4 tabular-nums text-muted-foreground">
                        {category.count} · {percentage}%
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
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
        <section className="pb-2" aria-labelledby="recent-discoveries-heading">
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
                className="w-[min(68vw,16rem)] shrink-0 snap-start"
              />
            ))}
          </div>
        </section>
      </div>
      {isAccountSheetOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/35"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsAccountSheetOpen(false)
            }
          }}
        >
          <section
            id="profile-account-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-account-sheet-title"
            className="mx-auto max-h-[calc(100dvh-1rem)] w-full max-w-lg touch-pan-y overflow-y-auto overscroll-contain rounded-t-[28px] bg-card px-5 pb-[max(2rem,var(--sterna-safe-area-bottom))] pt-3 text-foreground shadow-2xl"
          >
            <div
              className="mx-auto h-1 w-14 rounded-full bg-border"
              aria-hidden="true"
            />
            <h2
              id="profile-account-sheet-title"
              className="mt-7 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Account
            </h2>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-primary bg-green-50 p-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#C4622D] font-display text-xl font-semibold text-white">
                {displayedInitial}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-base font-semibold">
                  {displayedUserName}
                </strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Explorer · Since {memberSinceYear}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                <Check className="size-3.5" />
                Active
              </span>
            </div>
            <div className="mt-7 border-t border-border pt-7">
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <LogOut className="size-5" />
                Log out
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
