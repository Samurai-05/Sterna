import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'

import { BottomNavigation } from '@/components/BottomNavigation'
import {
  applySystemBarAppearance,
  getSystemBarAppearance,
} from '@/lib/system-bars'
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
  const { pathname } = useLocation()
  const showBottomNavigation = mainRoutes.has(pathname)
  // A one-way latch: a guest opening the app cold lands on the welcome
  // screen instead of the map. It releases the moment a session shows up —
  // including right after logging in from /login or /register — and then
  // stays released, so logging out later or navigating back to "/" doesn't
  // bounce a guest who is deliberately browsing the map — GET
  // /api/discoveries and /api/pois are public routes on purpose.
  //
  // The release check runs during render (not a useEffect) so it takes
  // effect on the very render that first sees the new session — e.g. right
  // after register/login navigates to "/". An effect-based release runs one
  // commit too late: the "/" route would already have evaluated the stale
  // (still signed-out) latch and rendered <Navigate to="/auth" />, sending a
  // freshly-registered user back to the welcome screen instead of the map.
  const [signedOutAtStart, setSignedOutAtStart] = useState(() => !loadSession())

  if (signedOutAtStart && loadSession()) {
    setSignedOutAtStart(false)
  }

  useEffect(() => {
    void applySystemBarAppearance(getSystemBarAppearance(pathname))
  }, [pathname])

  return (
    <div
      className={`sterna-app-shell min-h-dvh bg-background text-foreground ${showBottomNavigation ? 'sterna-app-shell--with-bottom-navigation' : ''}`}
    >
      <Routes>
        <Route
          path="/"
          element={
            signedOutAtStart ? <Navigate to="/auth" replace /> : <MapPage />
          }
        />
        <Route path="/auth" element={<WelcomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/add" element={<AddDiscoveryPage />} />
        <Route
          path="/discoveries/:discoveryId"
          element={<DiscoveryDetailPage />}
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
      {showBottomNavigation && <BottomNavigation />}
    </div>
  )
}

export default App
