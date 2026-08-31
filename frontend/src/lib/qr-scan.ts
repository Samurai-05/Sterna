import { Capacitor } from '@capacitor/core'
import {
  BarcodeFormat,
  BarcodeScanner,
  type Barcode,
} from '@capacitor-mlkit/barcode-scanning'

const SCANNER_ACTIVE_CLASS = 'barcode-scanner-active'

export function isQrScanAvailable(
  platform: string = Capacitor.getPlatform(),
): boolean {
  return platform === 'android'
}

export async function ensureCameraPermission(): Promise<boolean> {
  const status = await BarcodeScanner.checkPermissions()
  if (status.camera === 'granted' || status.camera === 'limited') {
    return true
  }
  if (status.camera === 'denied') {
    return false
  }

  const requested = await BarcodeScanner.requestPermissions()
  return requested.camera === 'granted' || requested.camera === 'limited'
}

export type QrScanSession = {
  /** Resolves with the raw text of the first QR code scanned, or null if cancelled. */
  result: Promise<string | null>
  cancel: () => void
}

/** Opens the native camera behind the WebView and scans for a single QR code. */
export function startQrScan(): QrScanSession {
  let finish: (value: string | null, error?: unknown) => void = () => {}

  const result = new Promise<string | null>((resolve, reject) => {
    let settled = false

    finish = (value, error) => {
      if (settled) return
      settled = true
      document.body.classList.remove(SCANNER_ACTIVE_CLASS)
      void BarcodeScanner.removeAllListeners()
      void BarcodeScanner.stopScan().catch(() => {})
      if (error) reject(error)
      else resolve(value)
    }

    BarcodeScanner.addListener('barcodesScanned', (event) => {
      const barcode: Barcode | undefined = event.barcodes[0]
      finish(barcode?.rawValue ?? null)
    })

    BarcodeScanner.addListener('scanError', (event) => {
      finish(null, new Error(event.message))
    })

    document.body.classList.add(SCANNER_ACTIVE_CLASS)
    BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] }).catch(
      (error: unknown) => finish(null, error),
    )
  })

  return { result, cancel: () => finish(null) }
}
