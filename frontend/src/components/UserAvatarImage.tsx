import { useEffect, useState } from 'react'

import { getPhoto } from '@/lib/api'

/**
 * Fills its parent with the account's photo, or the initial when there is
 * none or it fails to load — the parent supplies the circular frame,
 * fallback background color and font sizing, exactly as it did for the bare
 * initial before this existed.
 */
export function UserAvatarImage({
  accessToken,
  avatarObjectKey,
  initial,
}: {
  accessToken?: string
  avatarObjectKey?: string | null
  initial: string
}) {
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken || !avatarObjectKey) return

    let active = true
    let objectUrl: string | undefined

    void getPhoto(accessToken, avatarObjectKey)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setSource(objectUrl)
      })
      .catch(() => {})

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessToken, avatarObjectKey])

  // Gated on avatarObjectKey too, not just `source`: once the key is cleared
  // (or was never set), a still-loaded blob from a prior key must not flash
  // back up — the effect above only revokes it, it does not clear `source`.
  if (avatarObjectKey && source) {
    return <img src={source} alt="" className="size-full object-cover" />
  }

  return <span aria-hidden="true">{initial}</span>
}
