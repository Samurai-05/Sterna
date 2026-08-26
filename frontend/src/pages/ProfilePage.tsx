import { Award, Camera, MapPinned, Settings, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { DiscoveryCard } from '@/components/DiscoveryCard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { ApiError, getCurrentUser, getDiscoveries, getPois } from '@/lib/api'
import { clearSession, loadSession, saveSession } from '@/lib/session'

export function ProfilePage() {
  const [session, setSession] = useState(() => loadSession())
  const accessToken = session?.accessToken
  const { data: currentUser, error: currentUserError } = useQuery({
    queryKey: ['current-user', session?.accessToken],
    queryFn: () => getCurrentUser(accessToken!),
    enabled: Boolean(accessToken),
  })
  const { data: backendDiscoveries, isLoading: isLoadingDiscoveries } = useQuery(
    {
      queryKey: ['discoveries'],
      queryFn: getDiscoveries,
    },
  )
  const { data: backendPois } = useQuery({
    queryKey: ['pois'],
    queryFn: getPois,
  })
  const user = currentUser ?? session?.user
  const userName = user?.userName ?? 'Guest'
  const initial = userName.trim().charAt(0).toUpperCase() || 'G'
  const discoveries = backendDiscoveries ?? []
  const recentDiscoveries = discoveries.slice(0, 2)
  const countryCount = useMemo(
    () =>
      new Set(
        discoveries
          .map((discovery) => discovery.countryCode)
          .filter((countryCode) => countryCode !== 'UNK'),
      ).size,
    [discoveries],
  )

  useEffect(() => {
    if (!accessToken || !currentUser) return

    const nextSession = { accessToken, user: currentUser }
    saveSession(nextSession)
    setSession((storedSession) => {
      if (!storedSession) return storedSession
      if (
        storedSession.user.id === currentUser.id &&
        storedSession.user.email === currentUser.email &&
        storedSession.user.userName === currentUser.userName
      ) {
        return storedSession
      }

      return nextSession
    })
  }, [accessToken, currentUser])

  useEffect(() => {
    if (currentUserError instanceof ApiError && currentUserError.status === 401) {
      clearSession()
      setSession(null)
    }
  }, [currentUserError])

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  return (
    <main className="min-h-dvh bg-background pb-28">
      <PageHeader
        title="Profile"
        action={
          <Button
            size="icon"
            variant="ghost"
            className="size-11"
            aria-label="Profile settings"
          >
            <Settings />
          </Button>
        }
      />
      <div className="space-y-7 px-5">
        <section className="flex items-center gap-4">
          <span className="flex size-20 items-center justify-center rounded-full bg-[#fbf1ec] text-3xl font-semibold text-[#b8572b]">
            {initial}
          </span>
          <div>
            <h2 className="sterna-section-title">{userName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {user ? user.email : 'Not logged in'}
            </p>
          </div>
        </section>
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
        <section className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card py-4 text-center">
          <Stat
            icon={<Camera />}
            value={isLoadingDiscoveries ? '...' : discoveries.length}
            label="Discoveries"
          />
          <Stat
            icon={<MapPinned />}
            value={isLoadingDiscoveries ? '...' : countryCount}
            label={countryCount === 1 ? 'Country' : 'Countries'}
          />
          <Stat
            icon={<Trophy />}
            value={backendPois?.length ?? 0}
            label="POIs"
          />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="sterna-section-title">Recent</h2>
            <Link
              to="/collection"
              className="text-sm font-semibold text-primary"
            >
              See all
            </Link>
          </div>
          {recentDiscoveries.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {recentDiscoveries.map((discovery) => (
                <DiscoveryCard key={discovery.id} discovery={discovery} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isLoadingDiscoveries
                ? 'Loading recent discoveries'
                : 'No discoveries yet'}
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Award className="size-4 text-[#b8572b]" />
            Exploration progress
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f0eee8]">
            <div className="h-full w-[38%] rounded-full bg-primary" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {backendPois?.length ?? 0} points of interest available
          </p>
        </section>
      </div>
    </main>
  )
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
}) {
  return (
    <div className="px-2">
      <span className="mx-auto mb-1 block size-4 text-primary">{icon}</span>
      <strong className="sterna-heading block">{value}</strong>
      <span className="sterna-caption text-muted-foreground">{label}</span>
    </div>
  )
}
