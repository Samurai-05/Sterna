export interface AuthenticatedUser {
  id: string
  email: string
  userName: string
  avatarObjectKey: string | null
  createdAt: string
}

export interface AuthSession {
  accessToken: string
  user: AuthenticatedUser
}

const sessionStorageKey = 'sterna.auth'
const sessionChangeEvent = 'sterna.auth-change'

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session))
  notifySessionChange()
}

export function loadSession(): AuthSession | null {
  const rawSession = readSession()

  if (!rawSession) return null

  try {
    return JSON.parse(rawSession) as AuthSession
  } catch {
    window.localStorage.removeItem(sessionStorageKey)
    return null
  }
}

export function clearSession() {
  window.localStorage.removeItem(sessionStorageKey)
  notifySessionChange()
}

/** Raw stored session, as a stable snapshot for `useSyncExternalStore`. */
export function readSession(): string | null {
  return window.localStorage.getItem(sessionStorageKey)
}

/** Notifies on saves and clears in this tab, and on writes from other tabs. */
export function subscribeToSession(listener: () => void): () => void {
  window.addEventListener(sessionChangeEvent, listener)
  window.addEventListener('storage', listener)

  return () => {
    window.removeEventListener(sessionChangeEvent, listener)
    window.removeEventListener('storage', listener)
  }
}

function notifySessionChange() {
  window.dispatchEvent(new Event(sessionChangeEvent))
}
