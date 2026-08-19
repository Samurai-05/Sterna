import { Link, Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import DataPage from './pages/DataPage'
import NativePage from './pages/NativePage'

function App() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link>{' | '}
        <Link to="/map">Map</Link>{' | '}
        <Link to="/data">Data</Link>{' | '}
        <Link to="/native">Native</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/data" element={<DataPage />} />
        <Route path="/native" element={<NativePage />} />
      </Routes>
    </>
  )
}

export default App