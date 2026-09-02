import { forwardRef, StrictMode, useImperativeHandle } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/renderWithProviders'
import { saveMapViewport } from '@/lib/map-viewport'
import { MapPage } from './MapPage'

const { getCurrentDevicePositionMock, isNativeAndroidMock, locateMock } =
  vi.hoisted(() => ({
    getCurrentDevicePositionMock: vi.fn(),
    isNativeAndroidMock: vi.fn(() => false),
    locateMock: vi.fn(),
  }))

vi.mock('@/lib/device-location', () => ({
  getCurrentDevicePosition: getCurrentDevicePositionMock,
  isNativeAndroid: isNativeAndroidMock,
}))

vi.mock('@/components/MapCanvas', () => ({
  MapCanvas: forwardRef<
    {
      locate: () => void
      resize: () => void
      flyTo: () => void
      resetNorth: () => void
    },
    { initialViewport?: unknown; userLocation?: [number, number] }
  >(function MapCanvasMock({ initialViewport, userLocation }, _ref) {
    useImperativeHandle(_ref, () => ({
      locate: locateMock,
      resize: vi.fn(),
      flyTo: vi.fn(),
      resetNorth: vi.fn(),
    }))
    return (
      <div data-testid="map-canvas">
        {initialViewport ? JSON.stringify(initialViewport) : 'missing viewport'}
        {userLocation ? ` user-location:${JSON.stringify(userLocation)}` : ''}
      </div>
    )
  }),
}))

afterEach(() => {
  getCurrentDevicePositionMock.mockReset()
  isNativeAndroidMock.mockReset()
  isNativeAndroidMock.mockReturnValue(false)
  locateMock.mockReset()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('MapPage location startup', () => {
  it('renders the map after the Strict Mode effect replay', async () => {
    isNativeAndroidMock.mockReturnValue(true)
    let resolvePosition: ((position: {
      timestamp: number
      coords: { latitude: number; longitude: number }
    }) => void) | undefined
    getCurrentDevicePositionMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePosition = resolve
      }),
    )

    renderWithProviders(
      <StrictMode>
        <MapPage active />
      </StrictMode>,
      { route: '/' },
    )

    expect(screen.getByText('Finding your location…')).toBeInTheDocument()
    resolvePosition?.({
      timestamp: 123,
      coords: { latitude: 46.948, longitude: 7.4474 },
    })

    expect(await screen.findByTestId('map-canvas')).toHaveTextContent('7.4474')
    expect(getCurrentDevicePositionMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the default viewport when native location fails', async () => {
    isNativeAndroidMock.mockReturnValue(true)
    getCurrentDevicePositionMock.mockRejectedValue(
      new Error('Request to enable location was denied.'),
    )

    renderWithProviders(<MapPage active />, { route: '/' })

    expect(await screen.findByTestId('map-canvas')).toHaveTextContent(
      '"center":[0,20],"zoom":1.5',
    )
    expect(screen.getByTestId('map-canvas')).not.toHaveTextContent(
      'user-location',
    )
    expect(screen.queryByText('Finding your location…')).not.toBeInTheDocument()
  })

  it('shows the whole globe instead of a previously stored viewport when location fails', async () => {
    saveMapViewport({ center: [8.3093, 47.0502], zoom: 13 })
    isNativeAndroidMock.mockReturnValue(true)
    getCurrentDevicePositionMock.mockRejectedValue(
      new Error('Location unavailable'),
    )

    renderWithProviders(<MapPage active />, { route: '/' })

    expect(await screen.findByTestId('map-canvas')).toHaveTextContent(
      '"center":[0,20],"zoom":1.5',
    )
    expect(screen.getByTestId('map-canvas')).not.toHaveTextContent('8.3093')
    expect(screen.getByTestId('map-canvas')).not.toHaveTextContent(
      'user-location',
    )
  })

  it('uses the successful device position for the initial viewport', async () => {
    isNativeAndroidMock.mockReturnValue(true)
    getCurrentDevicePositionMock.mockResolvedValue({
      timestamp: 123,
      coords: { latitude: 46.948, longitude: 7.4474 },
    })

    renderWithProviders(<MapPage active />, { route: '/' })

    expect(await screen.findByTestId('map-canvas')).toHaveTextContent('7.4474')
    expect(screen.getByTestId('map-canvas')).toHaveTextContent(
      'user-location:[7.4474,46.948]',
    )
    expect(getCurrentDevicePositionMock).toHaveBeenCalledTimes(1)
  })

  it('ensures native location before triggering MapLibre locate', async () => {
    isNativeAndroidMock.mockReturnValue(true)
    getCurrentDevicePositionMock.mockResolvedValue({
      timestamp: 123,
      coords: { latitude: 46.948, longitude: 7.4474 },
    })

    renderWithProviders(<MapPage active />, { route: '/' })

    await screen.findByTestId('map-canvas')
    screen.getByRole('button', { name: 'Locate me' }).click()

    await waitFor(() => {
      expect(getCurrentDevicePositionMock).toHaveBeenCalledTimes(2)
      expect(locateMock).toHaveBeenCalledTimes(1)
      expect(locateMock).toHaveBeenCalledWith([7.4474, 46.948])
    })
  })

  it('removes the location dot when a later recenter request fails', async () => {
    isNativeAndroidMock.mockReturnValue(true)
    getCurrentDevicePositionMock
      .mockResolvedValueOnce({
        timestamp: 123,
        coords: { latitude: 46.948, longitude: 7.4474 },
      })
      .mockRejectedValueOnce(new Error('Location unavailable'))

    renderWithProviders(<MapPage active />, { route: '/' })

    expect(await screen.findByTestId('map-canvas')).toHaveTextContent(
      'user-location:[7.4474,46.948]',
    )
    screen.getByRole('button', { name: 'Locate me' }).click()

    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).not.toHaveTextContent(
        'user-location',
      )
    })
    expect(locateMock).not.toHaveBeenCalled()
  })
})
