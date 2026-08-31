import { beforeEach, describe, expect, it, vi } from 'vitest'

const capacitorMock = vi.hoisted(() => ({
  getPlatform: vi.fn(),
}))

const barcodeScannerMock = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  addListener: vi.fn(),
  removeAllListeners: vi.fn(),
  startScan: vi.fn(),
  stopScan: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: capacitorMock.getPlatform },
}))

vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeScanner: barcodeScannerMock,
  BarcodeFormat: { QrCode: 'QR_CODE' },
}))

const { ensureCameraPermission, isQrScanAvailable, startQrScan } =
  await import('./qr-scan')

beforeEach(() => {
  vi.clearAllMocks()
  document.body.className = ''
  barcodeScannerMock.removeAllListeners.mockResolvedValue(undefined)
  barcodeScannerMock.stopScan.mockResolvedValue(undefined)
  barcodeScannerMock.startScan.mockResolvedValue(undefined)
})

describe('isQrScanAvailable', () => {
  it('is only offered on Android', () => {
    expect(isQrScanAvailable('android')).toBe(true)
    expect(isQrScanAvailable('web')).toBe(false)
    expect(isQrScanAvailable('ios')).toBe(false)
  })

  it('falls back to the current Capacitor platform', () => {
    capacitorMock.getPlatform.mockReturnValue('android')
    expect(isQrScanAvailable()).toBe(true)
  })
})

describe('ensureCameraPermission', () => {
  it('accepts an already granted or limited permission without prompting', async () => {
    barcodeScannerMock.checkPermissions.mockResolvedValue({
      camera: 'granted',
    })
    expect(await ensureCameraPermission()).toBe(true)
    expect(barcodeScannerMock.requestPermissions).not.toHaveBeenCalled()
  })

  it('refuses without prompting once the user has denied it', async () => {
    barcodeScannerMock.checkPermissions.mockResolvedValue({
      camera: 'denied',
    })
    expect(await ensureCameraPermission()).toBe(false)
    expect(barcodeScannerMock.requestPermissions).not.toHaveBeenCalled()
  })

  it('prompts when permission has not been decided yet', async () => {
    barcodeScannerMock.checkPermissions.mockResolvedValue({
      camera: 'prompt',
    })
    barcodeScannerMock.requestPermissions.mockResolvedValue({
      camera: 'granted',
    })
    expect(await ensureCameraPermission()).toBe(true)
    expect(barcodeScannerMock.requestPermissions).toHaveBeenCalledOnce()
  })
})

describe('startQrScan', () => {
  function listenerFor(eventName: string) {
    const call = barcodeScannerMock.addListener.mock.calls.find(
      ([name]) => name === eventName,
    )
    if (!call) throw new Error(`no listener registered for ${eventName}`)
    return call[1] as (event: unknown) => void
  }

  it('resolves with the raw value of the first scanned barcode and cleans up', async () => {
    const session = startQrScan()
    expect(document.body.classList.contains('barcode-scanner-active')).toBe(
      true,
    )

    listenerFor('barcodesScanned')({
      barcodes: [{ rawValue: 'AB3K9QZ2' }],
    })

    await expect(session.result).resolves.toBe('AB3K9QZ2')
    expect(document.body.classList.contains('barcode-scanner-active')).toBe(
      false,
    )
    expect(barcodeScannerMock.stopScan).toHaveBeenCalledOnce()
    expect(barcodeScannerMock.removeAllListeners).toHaveBeenCalledOnce()
  })

  it('rejects when the plugin reports a scan error', async () => {
    const session = startQrScan()

    listenerFor('scanError')({ message: 'Camera unavailable' })

    await expect(session.result).rejects.toThrow('Camera unavailable')
  })

  it('resolves with null and stops the scan when cancelled', async () => {
    const session = startQrScan()

    session.cancel()

    await expect(session.result).resolves.toBeNull()
    expect(barcodeScannerMock.stopScan).toHaveBeenCalledOnce()
  })

  it('ignores a scan after the session has already settled', async () => {
    const session = startQrScan()
    session.cancel()
    await session.result

    listenerFor('barcodesScanned')({ barcodes: [{ rawValue: 'LATE' }] })

    // A second resolve/reject after settling would otherwise throw.
    await expect(session.result).resolves.toBeNull()
  })
})
