import { Route, Routes, useLocation } from 'react-router'

import { BottomNavigation } from '@/components/BottomNavigation'
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

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Routes>
        <Route path="/" element={<MapPage />} />
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
