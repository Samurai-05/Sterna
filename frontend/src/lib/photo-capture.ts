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
}: {
  platform?: string
  open?: () => Promise<SelectedPhoto | null>
  navigate: (to: string, options?: { state: { selectedPhoto: SelectedPhoto } }) => void
}) {
  if (platform !== 'android') {
    navigate('/add')
    return
  }

  try {
    const selectedPhoto = await open()
    if (selectedPhoto) {
      navigate('/add', { state: { selectedPhoto } })
    }
  } catch (error) {
    console.error('Unable to open native photo capture', error)
  }
}
