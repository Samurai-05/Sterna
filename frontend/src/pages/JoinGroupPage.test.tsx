import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const capacitorMock = vi.hoisted(() => ({ getPlatform: vi.fn() }))

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

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return { ...actual, joinGroup: vi.fn() }
})

const { joinGroup } = vi.mocked(await import('@/lib/api'))
const { JoinGroupPage } = await import('./JoinGroupPage')
const { renderWithProviders } = await import('@/test/renderWithProviders')

function listenerFor(eventName: string) {
  const call = barcodeScannerMock.addListener.mock.calls.find(
    ([name]) => name === eventName,
  )
  if (!call) throw new Error(`no listener registered for ${eventName}`)
  return call[1] as (event: unknown) => void
}

beforeEach(() => {
  vi.clearAllMocks()
  document.body.className = ''
  window.localStorage.setItem(
    'sterna.auth',
    JSON.stringify({
      accessToken: 'test-token',
      user: { id: '1', email: 'emma@example.com', userName: 'Emma' },
    }),
  )
  barcodeScannerMock.removeAllListeners.mockResolvedValue(undefined)
  barcodeScannerMock.stopScan.mockResolvedValue(undefined)
  barcodeScannerMock.startScan.mockResolvedValue(undefined)
})

afterEach(() => {
  window.localStorage.clear()
})

describe('scanning a QR code to join', () => {
  it('is not offered outside the Android app', () => {
    capacitorMock.getPlatform.mockReturnValue('web')
    renderWithProviders(<JoinGroupPage />)

    expect(
      screen.queryByRole('button', { name: /Scan QR code/ }),
    ).not.toBeInTheDocument()
  })

  it('joins the group with the code read from a scanned QR code', async () => {
    capacitorMock.getPlatform.mockReturnValue('android')
    barcodeScannerMock.checkPermissions.mockResolvedValue({
      camera: 'granted',
    })
    joinGroup.mockResolvedValue({
      id: '12',
      name: 'Paris Weekend',
      inviteCode: 'AB3K9QZ2',
    } as never)
    renderWithProviders(<JoinGroupPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Scan QR code/ }))
    await waitFor(() =>
      expect(barcodeScannerMock.startScan).toHaveBeenCalledOnce(),
    )

    listenerFor('barcodesScanned')({ barcodes: [{ rawValue: 'AB3K9QZ2' }] })

    // TanStack Query hands the mutation context as a second argument, so the
    // assertion looks at the payload alone.
    await waitFor(() => expect(joinGroup).toHaveBeenCalled())
    expect(joinGroup.mock.calls[0][0]).toEqual({
      accessToken: 'test-token',
      inviteCode: 'AB3K9QZ2',
    })
  })

  it('falls back to manual entry when the camera permission is denied', async () => {
    capacitorMock.getPlatform.mockReturnValue('android')
    barcodeScannerMock.checkPermissions.mockResolvedValue({
      camera: 'denied',
    })
    renderWithProviders(<JoinGroupPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Scan QR code/ }))

    expect(
      await screen.findByText(/Camera access was denied/),
    ).toBeInTheDocument()
    expect(barcodeScannerMock.startScan).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Invitation code/)).toBeInTheDocument()
  })
})
