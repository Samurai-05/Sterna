import { useMemo, useSyncExternalStore } from 'react'

import {
  loadSession,
  readSession,
  subscribeToSession,
  type AuthSession,
} from '@/lib/session'

/**
 * The stored session, re-read whenever it is saved or discarded. Screens that
 * only need the token at call time can keep using `loadSession()`; this is for
 * the ones that must react when the session goes away under them.
 */
export function useSession(): AuthSession | null {
  const storedSession = useSyncExternalStore(subscribeToSession, readSession)

  return useMemo(() => (storedSession ? loadSession() : null), [storedSession])
}
