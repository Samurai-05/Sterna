import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { startQrScan } from '@/lib/qr-scan'

export function QrScanner({
  onScan,
  onCancel,
  onError,
}: {
  onScan: (code: string) => void
  onCancel: () => void
  onError: (error: unknown) => void
}) {
  const callbacks = useRef({ onScan, onCancel, onError })

  useEffect(() => {
    callbacks.current = { onScan, onCancel, onError }
  })

  useEffect(() => {
    const session = startQrScan()
    session.result
      .then((code) => {
        if (code) callbacks.current.onScan(code)
        else callbacks.current.onCancel()
      })
      .catch((error: unknown) => callbacks.current.onError(error))

    return () => session.cancel()
  }, [])

  return (
    <div className="qr-scanner-overlay fixed inset-0 z-50 flex flex-col items-center justify-between bg-transparent py-10">
      <div />
      <div className="flex flex-col items-center gap-4">
        <div className="size-64 rounded-3xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
          Point the camera at a group's QR code
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel scan"
        className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white"
      >
        <X className="size-6" />
      </button>
    </div>
  )
}
