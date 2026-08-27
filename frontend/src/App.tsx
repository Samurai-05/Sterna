import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'

import { BottomNavigation } from '@/components/BottomNavigation'
import {
  applySystemBarAppearance,
  getSystemBarAppearance,
} from '@/lib/system-bars'
import { getDiscoveryRouteState } from '@/lib/route-state'
import { loadSession } from '@/lib/session'
import { AddDiscoveryPage } from '@/pages/AddDiscoveryPage'
import { CollectionPage } from '@/pages/CollectionPage'
import { CreateGroupPage } from '@/pages/CreateGroupPage'
import { DiscoveryDetailPage } from '@/pages/DiscoveryDetailPage'
import { EditDiscoveryPage } from '@/pages/EditDiscoveryPage'
import { GroupDetailPage } from '@/pages/GroupDetailPage'
import { GroupsPage } from '@/pages/GroupsPage'
import { LandmarkDetailPage } from '@/pages/LandmarkDetailPage'
import { MapPage } from '@/pages/MapPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SearchPage } from '@/pages/SearchPage'
import { WelcomePage } from '@/pages/WelcomePage'

const mainRoutes = new Set(['/', '/collection', '/groups', '/profile'])

function App() {
  const location = useLocation()
  const { pathname } = location
  const showBottomNavigation =
    mainRoutes.has(pathname) && Boolean(loadSession())

  useEffect(() => {
    void applySystemBarAppearance(getSystemBarAppearance(pathname))
  }, [pathname])

  return (
    <div
      className={`sterna-app-shell min-h-dvh bg-background text-foreground ${showBottomNavigation ? 'sterna-app-shell--with-bottom-navigation' : ''}`}
    >
      <Routes>
        <Route path="/auth" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuthentication />}>
          <Route
            path="*"
            element={
              <AuthenticatedAppShell
                showBottomNavigation={showBottomNavigation}
              />
            }
          />
        </Route>
      </Routes>
    </div>
  )
}

function AuthenticatedAppShell({
  showBottomNavigation,
}: {
  showBottomNavigation: boolean
}) {
  const location = useLocation()
  const routeState = getDiscoveryRouteState(location.state)
  const isMapDiscoveryOverlay =
    isDiscoveryDetailPath(location.pathname) &&
    routeState.backgroundLocation?.pathname === '/'

  return (
    <>
      <MapPage active={location.pathname === '/'} />
      <Routes>
        <Route path="/" element={null} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/add" element={<AddDiscoveryPage />} />
        <Route
          path="/discoveries/:discoveryId"
          element={
            <DiscoveryDetailPage
              presentation={isMapDiscoveryOverlay ? 'overlay' : 'page'}
            />
          }
        />
        <Route
          path="/discoveries/:discoveryId/edit"
          element={<EditDiscoveryPage />}
        />
        <Route path="/landmarks/:landmarkId" element={<LandmarkDetailPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/new" element={<CreateGroupPage />} />
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      {showBottomNavigation && <BottomNavigation />}
    </>
  )
}

function isDiscoveryDetailPath(pathname: string) {
  return /^\/discoveries\/[^/]+$/.test(pathname)
}

function RequireAuthentication() {
  return loadSession() ? <Outlet /> : <Navigate to="/auth" replace />
}

export default App
