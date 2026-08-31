import { Award, Check, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { PasswordInput } from '@/components/auth/PasswordInput'
import { CategoryIcon } from '@/components/CategoryIcon'
import { DiscoveryCard } from '@/components/DiscoveryCard'
import { Progress } from '@/components/ui/progress'
import {
  ApiError,
  deleteAccount,
  getAuthoredDiscoveries,
  getAuthoredPois,
  getCurrentUser,
} from '@/lib/api'
import { categoryAppearance } from '@/lib/category-appearance'
import { getCountryName } from '@/lib/countries'
import { categories, discoveries, landmarks } from '@/lib/mock-data'
import { clearSession, loadSession, saveSession } from '@/lib/session'

const ACTIVITY_MONTH_COUNT = 6
const ACTIVITY_CHART = {
  left: 28,
  right: 304,
  top: 18,
  bottom: 126,
}

export function ProfilePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => loadSession())
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const accessToken = session?.accessToken

  const { data: currentUser, error: currentUserError } = useQuery({
    queryKey: ['current-user', session?.accessToken],
    queryFn: () => getCurrentUser(accessToken!),
    enabled: Boolean(accessToken),
  })
  const { data: backendDiscoveries } = useQuery({
    queryKey: ['discoveries', session?.user.id, 'authored'],
    queryFn: () => getAuthoredDiscoveries(accessToken!),
    enabled: Boolean(accessToken),
  })
  const { data: backendPois } = useQuery({
    queryKey: ['pois', session?.user.id, 'authored'],
    queryFn: () => getAuthoredPois(accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60 * 1000,
  })

  const sourceDiscoveries = backendDiscoveries ?? (session ? [] : discoveries)
  const sourceLandmarks = backendPois ?? (session ? [] : landmarks)
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
  const categoryMaximum = Math.max(
    ...categoryCounts.map((category) => category.count),
    1,
  )
  const monthlyActivity = buildMonthlyActivity(sourceDiscoveries)
  const activityMaximum = Math.max(
    ...monthlyActivity.map((month) => month.count),
    1,
  )
  const activityPoints = monthlyActivity.map((month, index) => ({
    ...month,
    x:
      ACTIVITY_CHART.left +
      (index * (ACTIVITY_CHART.right - ACTIVITY_CHART.left)) /
        (ACTIVITY_MONTH_COUNT - 1),
    y:
      ACTIVITY_CHART.bottom -
      (month.count / activityMaximum) *
        (ACTIVITY_CHART.bottom - ACTIVITY_CHART.top),
  }))
  const activityPolyline = activityPoints
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const hasRecentActivity = monthlyActivity.some((month) => month.count > 0)
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
      if (event.key === 'Escape') closeAccountSheet()
    }

    document.addEventListener('keydown', closeAccountSheetWithKeyboard)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeAccountSheetWithKeyboard)
    }
  }, [isAccountSheetOpen])

  function closeAccountSheet() {
    setIsAccountSheetOpen(false)
    setIsDeleteConfirmOpen(false)
    setDeletePassword('')
    setDeleteError('')
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    navigate('/auth', { replace: true })
  }

  async function handleDeleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return

    setDeleteError('')

    try {
      setIsDeleting(true)
      await deleteAccount(accessToken, deletePassword)
      clearSession()
      navigate('/auth', { replace: true })
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Unable to delete the account.',
      )
    } finally {
      setIsDeleting(false)
    }
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
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm font-semibold">Your distribution</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {categoryTotal} total
              </p>
            </div>
            {categoryCounts.length ? (
              <div
                role="list"
                aria-label="Discovery distribution by category"
                className="relative mt-5 grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${categoryCounts.length}, minmax(0, 1fr))`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-40 border-t border-border"
                  aria-hidden="true"
                />
                {categoryCounts.map((category) => {
                  const appearance = categoryAppearance[category.id]
                  const discoveryLabel =
                    category.count === 1 ? 'discovery' : 'discoveries'
                  const relativeHeight =
                    (category.count / categoryMaximum) * 100

                  return (
                    <div
                      key={category.id}
                      role="listitem"
                      aria-label={`${category.label}: ${category.count} ${discoveryLabel}`}
                      className="relative z-10 min-w-0"
                    >
                      <div className="flex h-40 flex-col">
                        <span className="h-6 text-center text-xs font-semibold tabular-nums text-foreground">
                          {category.count}
                        </span>
                        <div className="flex flex-1 items-end px-1">
                          <div
                            data-category-bar={category.id}
                            className="mx-auto w-3/4 min-w-2 max-w-10 rounded-t-md transition-[height] duration-500"
                            style={{
                              height: `${relativeHeight}%`,
                              backgroundColor: appearance.color,
                            }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col items-center gap-1 text-center">
                        <span
                          className={`flex size-7 items-center justify-center rounded-md ${appearance.background}`}
                          aria-hidden="true"
                        >
                          <CategoryIcon
                            category={category.id}
                            className="size-3.5"
                          />
                        </span>
                        <div
                          className="max-w-full break-words text-[10px] font-medium leading-3 text-muted-foreground"
                          aria-hidden="true"
                        >
                          {category.label}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No discoveries yet.
              </p>
            )}
          </div>
        </section>
        <section aria-labelledby="discovery-activity-heading">
          <h2
            id="discovery-activity-heading"
            className="font-display text-[22px] font-semibold leading-7"
          >
            Discovery activity
          </h2>
          <div className="mt-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm font-semibold">Monthly creations</p>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            {hasRecentActivity ? (
              <svg
                viewBox="0 0 320 166"
                role="img"
                aria-label={`Discovery creations by month: ${monthlyActivity
                  .map((month) => `${month.label}: ${month.count}`)
                  .join(', ')}`}
                className="mt-4 h-auto w-full overflow-visible"
              >
                <line
                  x1={ACTIVITY_CHART.left}
                  x2={ACTIVITY_CHART.right}
                  y1={ACTIVITY_CHART.top}
                  y2={ACTIVITY_CHART.top}
                  className="stroke-border/50"
                  strokeDasharray="4 5"
                />
                <line
                  x1={ACTIVITY_CHART.left}
                  x2={ACTIVITY_CHART.right}
                  y1={ACTIVITY_CHART.bottom}
                  y2={ACTIVITY_CHART.bottom}
                  className="stroke-border"
                />
                <text
                  x="4"
                  y={ACTIVITY_CHART.top + 4}
                  className="fill-muted-foreground text-[9px] tabular-nums"
                >
                  {activityMaximum}
                </text>
                <text
                  x="12"
                  y={ACTIVITY_CHART.bottom + 4}
                  className="fill-muted-foreground text-[9px] tabular-nums"
                >
                  0
                </text>
                <polyline
                  points={activityPolyline}
                  fill="none"
                  stroke="#2D5A3D"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {activityPoints.map((point) => (
                  <g key={point.key}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4.5"
                      fill="#FFFFFF"
                      stroke="#2D5A3D"
                      strokeWidth="3"
                    />
                    <text
                      x={point.x}
                      y={Math.max(point.y - 10, 10)}
                      textAnchor="middle"
                      className="fill-foreground text-[9px] font-semibold tabular-nums"
                    >
                      {point.count}
                    </text>
                    <text
                      x={point.x}
                      y="151"
                      textAnchor="middle"
                      className="fill-muted-foreground text-[9px] font-medium"
                    >
                      {point.label}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No discoveries created in the last 6 months.
              </p>
            )}
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
            {exploredCountries.length ? (
              exploredCountries.map((country) => (
                <span
                  key={country}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium leading-4"
                >
                  {country}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No countries explored yet.
              </p>
            )}
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
            {sourceDiscoveries.length ? (
              sourceDiscoveries.slice(0, 3).map((discovery) => (
                <DiscoveryCard
                  key={discovery.id}
                  discovery={discovery}
                  className="w-[min(68vw,16rem)] shrink-0 snap-start"
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent discoveries yet.
              </p>
            )}
          </div>
        </section>
      </div>
      {isAccountSheetOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/35"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAccountSheet()
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

              {!isDeleteConfirmOpen ? (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-transparent px-4 font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <Trash2 className="size-5" />
                  Delete account
                </button>
              ) : (
                <form
                  onSubmit={(event) => void handleDeleteAccount(event)}
                  className="mt-3 space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4"
                >
                  <p className="text-sm font-semibold text-red-700">
                    This permanently deletes your account, your discoveries, and
                    your group memberships. Enter your password to confirm.
                  </p>
                  <PasswordInput
                    id="delete-account-password"
                    label="Password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    error={deleteError || undefined}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteConfirmOpen(false)
                        setDeletePassword('')
                        setDeleteError('')
                      }}
                      className="min-h-11 flex-1 rounded-xl border border-border bg-background px-4 font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDeleting || !deletePassword}
                      className="min-h-11 flex-1 rounded-xl bg-red-600 px-4 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                    >
                      {isDeleting ? 'Deleting…' : 'Delete permanently'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function buildMonthlyActivity(
  sourceDiscoveries: typeof discoveries,
  now = new Date(),
) {
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const months = Array.from({ length: ACTIVITY_MONTH_COUNT }, (_, index) => {
    const month = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - (ACTIVITY_MONTH_COUNT - 1 - index),
      1,
    )

    return {
      key: `${month.getFullYear()}-${month.getMonth()}`,
      year: month.getFullYear(),
      month: month.getMonth(),
      label: new Intl.DateTimeFormat('en', { month: 'short' }).format(month),
      count: 0,
    }
  })
  const monthByKey = new Map(months.map((month) => [month.key, month]))

  for (const discovery of sourceDiscoveries) {
    if (!discovery.createdAt) continue
    const createdAt = new Date(discovery.createdAt)
    if (Number.isNaN(createdAt.getTime())) continue

    const month = monthByKey.get(
      `${createdAt.getFullYear()}-${createdAt.getMonth()}`,
    )
    if (month) month.count += 1
  }

  return months
}
