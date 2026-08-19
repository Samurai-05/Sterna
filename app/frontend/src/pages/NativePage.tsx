import { Geolocation } from '@capacitor/geolocation'
import { useState } from 'react'

interface PositionDetails {
  accuracy: number
  latitude: number
  longitude: number
}

export default function NativePage() {
  const [permissions, setPermissions] = useState('Not checked')
  const [position, setPosition] = useState<PositionDetails | null>(null)
  const [error, setError] = useState('')

  async function checkPermissions() {
    setError('')

    try {
      const result = await Geolocation.checkPermissions()
      setPermissions(JSON.stringify(result))
    } catch (caughtError) {
      setError(
        `Unable to check permissions: ${caughtError instanceof Error ? caughtError.message : String(caughtError)}`,
      )
    }
  }

  async function requestPermissions() {
    setError('')

    try {
      const result = await Geolocation.requestPermissions()
      setPermissions(JSON.stringify(result))
    } catch (caughtError) {
      setError(
        `Unable to request permissions: ${caughtError instanceof Error ? caughtError.message : String(caughtError)}`,
      )
    }
  }

  async function getCurrentPosition() {
    setError('')

    try {
      const result = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      })
      setPosition({
        accuracy: result.coords.accuracy,
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      })
    } catch (caughtError) {
      setError(
        `Unable to get position: ${caughtError instanceof Error ? caughtError.message : String(caughtError)}`,
      )
    }
  }

  return (
    <main>
      <h1>Native geolocation</h1>
      <p>Permission status: {permissions}</p>
      <p>
        <button type="button" onClick={() => void checkPermissions()}>
          Check permissions
        </button>{' '}
        <button type="button" onClick={() => void requestPermissions()}>
          Request permissions
        </button>{' '}
        <button type="button" onClick={() => void getCurrentPosition()}>
          Get current position
        </button>
      </p>
      {position && (
        <p>
          Position: {position.latitude}, {position.longitude} (±{Math.round(position.accuracy)} m)
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  )
}
