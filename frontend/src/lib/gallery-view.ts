export type GalleryView = 'detailed' | 'grid'

const storagePrefix = 'sterna.galleryView'

export function loadGalleryView(userId: string | undefined): GalleryView {
  if (!userId) return 'detailed'

  try {
    return window.localStorage.getItem(storageKey(userId)) === 'grid'
      ? 'grid'
      : 'detailed'
  } catch {
    return 'detailed'
  }
}

export function saveGalleryView(
  userId: string | undefined,
  view: GalleryView,
): void {
  if (!userId) return

  try {
    window.localStorage.setItem(storageKey(userId), view)
  } catch {
    // Storage can be unavailable in privacy mode; the URL still preserves the
    // choice while the user remains inside the Gallery flow.
  }
}

function storageKey(userId: string): string {
  return `${storagePrefix}.${userId}`
}
