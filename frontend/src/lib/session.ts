export interface AuthenticatedUser {
  id: string
  email: string
  userName: string
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  accessToken: string
  user: AuthenticatedUser
}

const sessionStorageKey = 'sterna.auth'

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session))
}

export function loadSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(sessionStorageKey)

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
}
