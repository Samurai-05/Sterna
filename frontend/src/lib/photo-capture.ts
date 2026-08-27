import { Capacitor, registerPlugin } from '@capacitor/core'

export type SelectedPhoto = {
  path: string
  mimeType: string
  fileName: string
  source: 'camera' | 'gallery'
}

type SternaPhotoCapturePlugin = {
  open: () => Promise<SelectedPhoto | null>
}

export const SternaPhotoCapture = registerPlugin<SternaPhotoCapturePlugin>(
  'SternaPhotoCapture',
)

export async function openNativePhotoCapture(): Promise<SelectedPhoto | null> {
  return SternaPhotoCapture.open()
}

export async function createDiscoveryPhotoAction({
  platform = Capacitor.getPlatform(),
  open = openNativePhotoCapture,
  navigate,
  returnTo,
}: {
  platform?: string
  open?: () => Promise<SelectedPhoto | null>
  navigate: (
    to: string,
    options?: {
      state: { selectedPhoto?: SelectedPhoto; returnTo?: string }
    },
  ) => void
  returnTo?: string
}) {
  if (platform !== 'android') {
    if (returnTo) {
      navigate('/add', { state: { returnTo } })
    } else {
      navigate('/add')
    }
    return
  }

  try {
    const selectedPhoto = await open()
    if (selectedPhoto) {
      navigate('/add', {
        state: { selectedPhoto, ...(returnTo ? { returnTo } : {}) },
      })
    }
  } catch (error) {
    console.error('Unable to open native photo capture', error)
  }
}
