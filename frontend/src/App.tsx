import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import { BottomNavigation } from '@/components/BottomNavigation'
import {
  applySystemBarAppearance,
  getSystemBarAppearance,
} from '@/lib/system-bars'
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
import { SearchPage } from '@/pages/SearchPage'

const mainRoutes = new Set(['/', '/collection', '/groups', '/profile'])

function App() {
  const { pathname } = useLocation()
  const showBottomNavigation = mainRoutes.has(pathname)

  useEffect(() => {
    void applySystemBarAppearance(getSystemBarAppearance(pathname))
  }, [pathname])

  return (
    <div
      className={`sterna-app-shell min-h-dvh bg-background text-foreground ${showBottomNavigation ? 'sterna-app-shell--with-bottom-navigation' : ''}`}
    >
      <Routes>
        <Route path="/" element={<MapPage />} />
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
      </Routes>
      {showBottomNavigation && <BottomNavigation />}
    </div>
  )
}

export default App
