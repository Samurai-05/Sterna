import { Check, LogOut, Settings, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { PasswordInput } from '@/components/auth/PasswordInput'
import { ProfileCategoryBreakdown } from '@/components/ProfileCategoryBreakdown'
import { ProfileDiscoveryCard } from '@/components/ProfileDiscoveryCard'
import { ProfileExplorationOverTime } from '@/components/ProfileExplorationOverTime'
import { ProfileExplorationStats } from '@/components/ProfileExplorationStats'
import { ProfileWorldMap } from '@/components/ProfileWorldMap'
import { UserAvatarImage } from '@/components/UserAvatarImage'
import { Progress } from '@/components/ui/progress'
import {
  deleteAccount,
  getAuthoredDiscoveries,
  getAuthoredPois,
  getCurrentUser,
} from '@/lib/api'
import { getCountryName } from '@/lib/countries'
import {
  exploredCountryCodes,
  explorationOverTime,
  recentProfileDiscoveries,
  uniqueProfileDiscoveries,
} from '@/lib/profile-analytics'
import { discoveries, landmarks } from '@/lib/mock-data'
import { clearSession, loadSession, saveSession } from '@/lib/session'

export function ProfilePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => loadSession())
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const accessToken = session?.accessToken

  const { data: currentUser } = useQuery({
    queryKey: ['current-user', session?.accessToken],
    queryFn: () => getCurrentUser(accessToken!),
    enabled: Boolean(accessToken),
  })
  const {
    data: backendDiscoveries,
    isPending: isDiscoveriesPending,
    isError: isDiscoveriesError,
    refetch: refetchDiscoveries,
  } = useQuery({
    queryKey: ['discoveries', session?.user.id, 'authored'],
    queryFn: () => getAuthoredDiscoveries(accessToken!),
    enabled: Boolean(accessToken),
  })
  const {
    data: backendPois,
    isPending: isPoisPending,
    isError: isPoisError,
    refetch: refetchPois,
  } = useQuery({
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
  const profileDiscoveries = uniqueProfileDiscoveries(sourceDiscoveries)
  const exploredCodes = exploredCountryCodes(profileDiscoveries)
  const exploredCountries = exploredCodes
    .map((countryCode) => getCountryName(countryCode))
    .filter((country): country is string => Boolean(country))
  const recentDiscoveries = recentProfileDiscoveries(profileDiscoveries)
  const explorationMonths = explorationOverTime(profileDiscoveries)
  const isDiscoveriesLoading = Boolean(accessToken && isDiscoveriesPending)
  const isDiscoveriesUnavailable = Boolean(accessToken && isDiscoveriesError)
  const isPoisLoading = Boolean(accessToken && isPoisPending)
  const isPoisUnavailable = Boolean(accessToken && isPoisError)
  const progress = sourceLandmarks.length
    ? (discoveredLandmarks.length / sourceLandmarks.length) * 100
    : 0

  useEffect(() => {
    if (!accessToken || !currentUser) return

    const nextSession = { accessToken, user: currentUser }
    saveSession(nextSession)
  }, [accessToken, currentUser])

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
                <UserAvatarImage
                  accessToken={accessToken}
                  avatarObjectKey={displayedUser?.avatarObjectKey}
                  initial={displayedInitial}
                />
              </button>
            </div>
          </div>
        </section>
      </div>
      <div className="-mt-6 rounded-t-3xl bg-background px-5 pb-12 pt-8">
        <div className="mx-auto max-w-lg space-y-10">
          <section aria-labelledby="your-exploration-heading">
            <h2 id="your-exploration-heading" className="sterna-section-title">
              Your exploration
            </h2>
            <div className="mt-6">
              <ProfileExplorationStats
                discoveries={
                  isDiscoveriesLoading || isDiscoveriesUnavailable
                    ? null
                    : profileDiscoveries.length
                }
                countries={
                  isDiscoveriesLoading || isDiscoveriesUnavailable
                    ? null
                    : exploredCodes.length
                }
                pois={
                  isPoisLoading || isPoisUnavailable
                    ? null
                    : discoveredLandmarks.length
                }
              />
            </div>
            <div className="mt-6">
              {isDiscoveriesLoading ? (
                <ProfileWorldMap exploredCountryCodes={[]} />
              ) : isDiscoveriesUnavailable ? (
                <div className="rounded-2xl border border-border bg-secondary px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground" role="status">
                    Exploration data is temporarily unavailable.
                  </p>
                  <button
                    type="button"
                    onClick={() => void refetchDiscoveries()}
                    className="mt-3 min-h-11 rounded-xl px-4 text-sm font-semibold text-primary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <ProfileWorldMap exploredCountryCodes={exploredCodes} />
              )}
            </div>
          </section>

          <section aria-labelledby="recent-discoveries-heading">
            <div className="flex items-end justify-between gap-4">
              <h2
                id="recent-discoveries-heading"
                className="sterna-section-title"
              >
                Recent discoveries
              </h2>
              <Link
                to="/collection"
                className="flex min-h-11 items-center text-sm font-semibold text-primary"
              >
                See all
              </Link>
            </div>
            {isDiscoveriesLoading ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status">
                Loading recent discoveries…
              </p>
            ) : isDiscoveriesUnavailable ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status">
                Recent discoveries are temporarily unavailable.
              </p>
            ) : recentDiscoveries.length ? (
              <div className="-mr-5 mt-4 flex snap-x gap-4 overflow-x-auto pb-2 pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recentDiscoveries.map((discovery) => (
                  <ProfileDiscoveryCard
                    key={discovery.id}
                    discovery={discovery}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No recent discoveries yet.
              </p>
            )}
          </section>

          <section aria-labelledby="points-of-interest-heading">
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id="points-of-interest-heading"
                className="sterna-section-title"
              >
                Points of interest
              </h2>
              {!isPoisLoading && !isPoisUnavailable && (
                <p className="text-sm tabular-nums text-muted-foreground">
                  {discoveredLandmarks.length} of {sourceLandmarks.length}{' '}
                  discovered
                </p>
              )}
            </div>
            {isPoisLoading ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status">
                Loading point of interest progress…
              </p>
            ) : isPoisUnavailable ? (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground" role="status">
                  Point of interest progress is temporarily unavailable.
                </p>
                <button
                  type="button"
                  onClick={() => void refetchPois()}
                  className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <Progress
                  className="h-2.5"
                  value={progress}
                  aria-label="Point of interest exploration progress"
                  aria-valuetext={`${discoveredLandmarks.length} of ${sourceLandmarks.length} points of interest discovered`}
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  {discoveredLandmarks.length} / {sourceLandmarks.length} points
                  of interest discovered
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="discoveries-by-category-heading">
            <h2
              id="discoveries-by-category-heading"
              className="sterna-section-title"
            >
              Discoveries by category
            </h2>
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              {isDiscoveriesLoading || isDiscoveriesUnavailable ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {isDiscoveriesLoading
                    ? 'Loading category breakdown…'
                    : 'Category data is temporarily unavailable.'}
                </p>
              ) : (
                <ProfileCategoryBreakdown discoveries={profileDiscoveries} />
              )}
            </div>
          </section>

          <ProfileExplorationOverTime
            months={isDiscoveriesUnavailable ? [] : explorationMonths}
          />

          <section aria-labelledby="countries-explored-heading">
            <h2
              id="countries-explored-heading"
              className="sterna-section-title"
            >
              Countries explored
            </h2>
            {isDiscoveriesUnavailable ? (
              <p className="mt-3 text-sm text-muted-foreground" role="status">
                Country data is temporarily unavailable.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {exploredCountries.length ? (
                  exploredCountries.map((country) => (
                    <span
                      key={country}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium leading-4"
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
            )}
          </section>
        </div>
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
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C4622D] font-display text-xl font-semibold text-white">
                <UserAvatarImage
                  accessToken={accessToken}
                  avatarObjectKey={displayedUser?.avatarObjectKey}
                  initial={displayedInitial}
                />
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
            <Link
              to="/profile/edit"
              onClick={closeAccountSheet}
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <Settings className="size-5" />
              Edit profile
            </Link>
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
