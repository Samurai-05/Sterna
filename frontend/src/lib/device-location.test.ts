import { afterEach, describe, expect, it, vi } from 'vitest'

const { getPlatformMock, nativeGetCurrentPositionMock, checkPermissionsMock } =
  vi.hoisted(() => ({
    getPlatformMock: vi.fn(() => 'web'),
    nativeGetCurrentPositionMock: vi.fn(),
    checkPermissionsMock: vi.fn().mockResolvedValue({
      location: 'granted',
      coarseLocation: 'granted',
    }),
  }))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: getPlatformMock,
  },
}))

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: nativeGetCurrentPositionMock,
    checkPermissions: checkPermissionsMock,
  },
}))

import {
  DeviceLocationError,
  getCurrentDevicePosition,
} from './device-location'

const originalGeolocation = window.navigator.geolocation

afterEach(() => {
  getPlatformMock.mockReset()
  getPlatformMock.mockReturnValue('web')
  nativeGetCurrentPositionMock.mockReset()
  checkPermissionsMock.mockReset()
  checkPermissionsMock.mockResolvedValue({
    location: 'granted',
    coarseLocation: 'granted',
  })
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: originalGeolocation,
  })
  vi.restoreAllMocks()
})

describe('getCurrentDevicePosition', () => {
  it('uses a fresh native Android position and verifies location services afterwards', async () => {
    getPlatformMock.mockReturnValue('android')
    nativeGetCurrentPositionMock.mockResolvedValue({
      timestamp: 123,
      coords: { latitude: 46.948, longitude: 7.4474, accuracy: 12 },
    })

    await expect(getCurrentDevicePosition()).resolves.toEqual({
      timestamp: 123,
      coords: { latitude: 46.948, longitude: 7.4474, accuracy: 12 },
    })

    expect(nativeGetCurrentPositionMock).toHaveBeenCalledWith({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      enableLocationFallback: true,
    })
    expect(checkPermissionsMock).toHaveBeenCalledTimes(1)
    expect(nativeGetCurrentPositionMock.mock.invocationCallOrder[0]).toBeLessThan(
      checkPermissionsMock.mock.invocationCallOrder[0],
    )
  })

  it('rejects a native fallback position when Android location services are disabled', async () => {
    getPlatformMock.mockReturnValue('android')
    nativeGetCurrentPositionMock.mockResolvedValue({
      timestamp: 123,
      coords: { latitude: 47.0502, longitude: 8.3093, accuracy: 12 },
    })
    checkPermissionsMock.mockRejectedValue({
      code: 'OS-PLUG-GLOC-0007',
      message: 'Location services are not enabled.',
    })

    await expect(getCurrentDevicePosition()).rejects.toMatchObject({
      reason: 'location-disabled',
    })
  })

  it('reports a cancelled Android location-enable request distinctly', async () => {
    getPlatformMock.mockReturnValue('android')
    nativeGetCurrentPositionMock.mockRejectedValue({
      code: 'OS-PLUG-GLOC-0009',
      message: 'Request to enable location was denied.',
    })

    const error = await getCurrentDevicePosition().catch((value) => value)

    expect(error).toBeInstanceOf(DeviceLocationError)
    expect(error).toMatchObject({ reason: 'location-enable-denied' })
  })

  it('uses browser geolocation on web with the caller options', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        timestamp: 456,
        coords: { latitude: 48.8566, longitude: 2.3522, accuracy: 25 },
      } as GeolocationPosition)
    })
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    await expect(
      getCurrentDevicePosition({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      }),
    ).resolves.toEqual({
      timestamp: 456,
      coords: { latitude: 48.8566, longitude: 2.3522, accuracy: 25 },
    })

    expect(nativeGetCurrentPositionMock).not.toHaveBeenCalled()
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    )
  })

  it('rejects an imprecise web location instead of presenting it as the user position', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        timestamp: 456,
        coords: {
          latitude: 47.0502,
          longitude: 8.3093,
          accuracy: 25000,
        },
      } as GeolocationPosition)
    })
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    await expect(getCurrentDevicePosition()).rejects.toMatchObject({
      reason: 'unavailable',
      message: 'The available device location is too imprecise.',
    })

    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  })

  it('normalizes browser permission denial and timeout errors', async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1,
          message: 'User denied Geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError)
      },
    )
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    await expect(getCurrentDevicePosition()).rejects.toMatchObject({
      reason: 'permission-denied',
    })

    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 3,
          message: 'Timeout expired',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError)
      },
    )

    await expect(getCurrentDevicePosition()).rejects.toMatchObject({
      reason: 'timeout',
    })
  })
})
