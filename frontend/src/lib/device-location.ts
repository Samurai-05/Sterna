import { Capacitor } from '@capacitor/core'
import {
  Geolocation,
  type PositionOptions as NativePositionOptions,
} from '@capacitor/geolocation'

export type DeviceLocationErrorReason =
  | 'permission-denied'
  | 'location-disabled'
  | 'location-enable-denied'
  | 'timeout'
  | 'unavailable'
  | 'unknown'

export class DeviceLocationError extends Error {
  readonly reason: DeviceLocationErrorReason
  readonly cause?: unknown

  constructor(
    reason: DeviceLocationErrorReason,
    message: string,
    cause?: unknown,
  ) {
    super(message)
    this.name = 'DeviceLocationError'
    this.reason = reason
    this.cause = cause
  }
}

export type DeviceLocationPosition = {
  timestamp: number
  coords: {
    latitude: number
    longitude: number
    accuracy: number
  }
}

export type DeviceLocationOptions = {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  maximumAcceptedAccuracy?: number
}

const nativeLocationOptions: NativePositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  enableLocationFallback: true,
}

const defaultWebLocationOptions: DeviceLocationOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 0,
  maximumAcceptedAccuracy: 1000,
}

let pendingNativePosition: Promise<DeviceLocationPosition> | null = null

export function isNativeAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

/**
 * Gets a device position through the native Android settings-resolution flow
 * or the browser geolocation API on web/PWA builds.
 */
export function getCurrentDevicePosition(
  webOptions: DeviceLocationOptions = defaultWebLocationOptions,
): Promise<DeviceLocationPosition> {
  if (isNativeAndroid()) {
    if (!pendingNativePosition) {
      pendingNativePosition = Promise.resolve()
        .then(() => Geolocation.getCurrentPosition(nativeLocationOptions))
        .then(async (position) => {
          // getCurrentPosition may return an Android cached/fallback position
          // even though location services are disabled. Confirm the system
          // state before treating it as the user's current position.
          await Geolocation.checkPermissions()
          return toDeviceLocationPosition(
            position,
            webOptions.maximumAcceptedAccuracy,
          )
        })
        .catch((error: unknown) => {
          throw normalizeLocationError(error)
        })
        .finally(() => {
          pendingNativePosition = null
        })
    }
    return pendingNativePosition
  }

  return getBrowserPosition(webOptions)
}

function getBrowserPosition(
  options: DeviceLocationOptions,
): Promise<DeviceLocationPosition> {
  const { maximumAcceptedAccuracy, ...browserOptions } = options

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(
        new DeviceLocationError(
          'unavailable',
          'Browser geolocation is not available.',
        ),
      )
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          resolve(toDeviceLocationPosition(position, maximumAcceptedAccuracy))
        } catch (error) {
          reject(error)
        }
      },
      (error) => reject(normalizeLocationError(error)),
      browserOptions,
    )
  })
}

function toDeviceLocationPosition(
  position: {
    timestamp: number
    coords: { latitude: number; longitude: number; accuracy: number }
  },
  maximumAcceptedAccuracy?: number,
): DeviceLocationPosition {
  if (
    maximumAcceptedAccuracy !== undefined &&
    (!Number.isFinite(position.coords.accuracy) ||
      position.coords.accuracy > maximumAcceptedAccuracy)
  ) {
    throw new DeviceLocationError(
      'unavailable',
      'The available device location is too imprecise.',
    )
  }

  return {
    timestamp: position.timestamp,
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    },
  }
}

function normalizeLocationError(error: unknown): DeviceLocationError {
  if (error instanceof DeviceLocationError) return error

  const code = getErrorCode(error)
  const message = getErrorMessage(error)

  switch (code) {
    case 1:
    case 'OS-PLUG-GLOC-0003':
      return new DeviceLocationError('permission-denied', message, error)
    case 'OS-PLUG-GLOC-0007':
      return new DeviceLocationError('location-disabled', message, error)
    case 'OS-PLUG-GLOC-0009':
      return new DeviceLocationError('location-enable-denied', message, error)
    case 3:
    case 'OS-PLUG-GLOC-0010':
      return new DeviceLocationError('timeout', message, error)
    case 2:
    case 'OS-PLUG-GLOC-0002':
    case 'OS-PLUG-GLOC-0017':
      return new DeviceLocationError('unavailable', message, error)
  }

  if (/permission|not allowed|denied/i.test(message)) {
    return new DeviceLocationError('permission-denied', message, error)
  }
  if (/enable location|location services|settings/i.test(message)) {
    return new DeviceLocationError('location-enable-denied', message, error)
  }
  if (/timeout|in time/i.test(message)) {
    return new DeviceLocationError('timeout', message, error)
  }

  return new DeviceLocationError('unknown', message, error)
}

function getErrorCode(error: unknown): number | string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined
  }
  const code = (error as { code?: unknown }).code
  return typeof code === 'number' || typeof code === 'string' ? code : undefined
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return 'Unable to obtain the current device location.'
}
