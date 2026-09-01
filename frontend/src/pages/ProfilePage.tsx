import { Check, LogOut, Settings, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { PasswordInput } from '@/components/auth/PasswordInput'
import { ProfileCategoryBreakdown } from '@/components/ProfileCategoryBreakdown'
import { ProfileDiscoveryCard } from '@/components/ProfileDiscoveryCard'
import { ProfileExplorationStats } from '@/components/ProfileExplorationStats'
import { ProfileWorldMap } from '@/components/ProfileWorldMap'
import { UserAvatarImage } from '@/components/UserAvatarImage'
import { Progress } from '@/components/ui/progress'
import {
  ApiError,
  deleteAccount,
  getAuthoredDiscoveries,
  getAuthoredPois,
  getCurrentUser,
} from '@/lib/api'
import {
  exploredCountryCodes,
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

  const { data: currentUser, error: currentUserError } = useQuery({
    queryKey: ['current-user', session?.accessToken],
    queryFn: () => getCurrentUser(accessToken!),
    enabled: Boolean(accessToken),
  })
  const { data: backendDiscoveries, isPending: isDiscoveriesPending } =
    useQuery({
      queryKey: ['discoveries', session?.user.id, 'authored'],
      queryFn: () => getAuthoredDiscoveries(accessToken!),
      enabled: Boolean(accessToken),
    })
  const { data: backendPois, isPending: isPoisPending } = useQuery({
    queryKey: ['pois', session?.user.id, 'authored'],
    queryFn: () => getAuthoredPois(accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60 * 1000,
  })

  const sourceDiscoveries = backendDiscoveries ?? (session ? [] : discoveries)
  const profileDiscoveries = uniqueProfileDiscoveries(sourceDiscoveries)
  const sourceLandmarks = backendPois ?? (session ? [] : landmarks)
  const displayedUser = currentUser ?? session?.user
  const displayedUserName = displayedUser?.userName ?? ''
  const displayedInitial = displayedUserName.trim().charAt(0).toUpperCase()
  const discoveredLandmarks = sourceLandmarks.filter(
    (landmark) => landmark.discovered,
  )
  const exploredCodes = exploredCountryCodes(profileDiscoveries)
  const recentDiscoveries = recentProfileDiscoveries(profileDiscoveries)
  const isDiscoveriesLoading = Boolean(accessToken && isDiscoveriesPending)
  const isPoisLoading = Boolean(accessToken && isPoisPending)
  const hasDiscoveries = !isDiscoveriesLoading && profileDiscoveries.length > 0
  const poiProgress = sourceLandmarks.length
    ? (discoveredLandmarks.length / sourceLandmarks.length) * 100
    : 0

  useEffect(() => {
    if (!accessToken || !currentUser) return

    saveSession({ accessToken, user: currentUser })
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
    <main className="min-h-dvh bg-background pb-24">
      <div className="bg-[linear-gradient(150deg,#1D3B28_0%,#2D5A3D_100%)] text-primary-foreground">
        <section
          className="px-5 pb-9 pt-[calc(1rem+var(--sterna-safe-area-top))]"
          aria-label="Profile overview"
        >
          <div className="relative mx-auto max-w-lg">
            <div className="flex min-w-0 items-center gap-3 pr-12">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/40 bg-[#C4622D] font-display text-3xl font-semibold text-primary-foreground">
                <UserAvatarImage
                  accessToken={accessToken}
                  avatarObjectKey={displayedUser?.avatarObjectKey}
                  initial={displayedInitial}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary-foreground/70">
                  My profile
                </p>
                <h1 className="mt-1 truncate font-display text-[26px] font-semibold leading-8">
                  {displayedUserName}
                </h1>
              </div>
            </div>
            <button
              type="button"
              aria-label="Open account settings"
              aria-expanded={isAccountSheetOpen}
              aria-controls="profile-account-sheet"
              onClick={() => setIsAccountSheetOpen(true)}
              title="Settings"
              className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-xl border border-white/30 text-primary-foreground outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95"
            >
              <Settings className="size-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      <div className="-mt-5 rounded-t-[24px] bg-background px-5 pb-12 pt-8">
        <div className="mx-auto max-w-lg space-y-10">
          <section aria-labelledby="your-exploration-heading">
            <h2 id="your-exploration-heading" className="sterna-section-title">
              Your exploration
            </h2>
            <div className="mt-6">
              <ProfileExplorationStats
                discoveries={
                  isDiscoveriesLoading ? null : profileDiscoveries.length
                }
                countries={isDiscoveriesLoading ? null : exploredCodes.length}
                pois={isPoisLoading ? null : discoveredLandmarks.length}
              />
            </div>
            <div className="mt-6">
              <ProfileWorldMap exploredCountryCodes={exploredCodes} />
            </div>
          </section>

          {isDiscoveriesLoading ? null : hasDiscoveries ? (
            <>
              <section
                aria-labelledby="recent-discoveries-heading"
                aria-label="Recent discoveries"
              >
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
                <div className="-mr-5 mt-4 flex snap-x gap-4 overflow-x-auto pb-2 pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {recentDiscoveries.map((discovery) => (
                    <ProfileDiscoveryCard
                      key={discovery.id}
                      discovery={discovery}
                    />
                  ))}
                </div>
              </section>

              {!isPoisLoading && (
                <section aria-labelledby="points-of-interest-heading">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2
                      id="points-of-interest-heading"
                      className="sterna-section-title"
                    >
                      Points of interest
                    </h2>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {discoveredLandmarks.length} of {sourceLandmarks.length}{' '}
                      discovered
                    </p>
                  </div>
                  <Progress
                    className="mt-4 h-2.5"
                    value={poiProgress}
                    aria-label="Point of interest exploration progress"
                    aria-valuetext={`${discoveredLandmarks.length} of ${sourceLandmarks.length} points of interest discovered`}
                  />
                </section>
              )}

              <section aria-labelledby="discoveries-by-category-heading">
                <h2
                  id="discoveries-by-category-heading"
                  className="sterna-section-title"
                >
                  Discoveries by category
                </h2>
                <ProfileCategoryBreakdown discoveries={profileDiscoveries} />
              </section>
            </>
          ) : (
            <section
              aria-label="Start exploring"
              className="rounded-2xl bg-[#F0EEE8] px-5 py-8 text-center"
            >
              <h2 className="font-display text-2xl font-semibold leading-8 text-foreground">
                Your world starts here.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-base leading-6 text-muted-foreground">
                Save your first discovery and start revealing the places
                you&apos;ve explored.
              </p>
              <Link
                to="/add"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 text-button text-primary-foreground transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Add discovery
              </Link>
            </section>
          )}
        </div>
      </div>

      {isAccountSheetOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/35"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAccountSheet()
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
                  Account access is active
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                <Check className="size-3.5" aria-hidden="true" />
                Active
              </span>
            </div>
            <Link
              to="/profile/edit"
              onClick={closeAccountSheet}
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <Settings className="size-5" aria-hidden="true" />
              Edit profile
            </Link>
            <div className="mt-7 border-t border-border pt-7">
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <LogOut className="size-5" aria-hidden="true" />
                Log out
              </button>

              {!isDeleteConfirmOpen ? (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-transparent px-4 font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <Trash2 className="size-5" aria-hidden="true" />
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
