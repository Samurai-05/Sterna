import { forwardRef, useImperativeHandle } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '@/test/renderWithProviders'
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
    { initialViewport?: unknown }
  >(function MapCanvasMock({ initialViewport }, _ref) {
    useImperativeHandle(_ref, () => ({
      locate: locateMock,
      resize: vi.fn(),
      flyTo: vi.fn(),
      resetNorth: vi.fn(),
    }))
    return (
      <div data-testid="map-canvas">
        {initialViewport ? JSON.stringify(initialViewport) : 'missing viewport'}
      </div>
    )
  }),
}))

afterEach(() => {
  getCurrentDevicePositionMock.mockReset()
  isNativeAndroidMock.mockReset()
  isNativeAndroidMock.mockReturnValue(false)
  locateMock.mockReset()
  vi.restoreAllMocks()
})

describe('MapPage location startup', () => {
  it('falls back to the default viewport when native location fails', async () => {
    isNativeAndroidMock.mockReturnValue(true)
    getCurrentDevicePositionMock.mockRejectedValue(
      new Error('Request to enable location was denied.'),
    )

    renderWithProviders(<MapPage active />, { route: '/' })

    expect(await screen.findByTestId('map-canvas')).toHaveTextContent('2.3522')
    expect(screen.queryByText('Finding your location…')).not.toBeInTheDocument()
  })

  it('uses the successful device position for the initial viewport', async () => {
    isNativeAndroidMock.mockReturnValue(true)
    getCurrentDevicePositionMock.mockResolvedValue({
      timestamp: 123,
      coords: { latitude: 46.948, longitude: 7.4474 },
    })

    renderWithProviders(<MapPage active />, { route: '/' })

    expect(await screen.findByTestId('map-canvas')).toHaveTextContent('7.4474')
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
    })
  })
})
