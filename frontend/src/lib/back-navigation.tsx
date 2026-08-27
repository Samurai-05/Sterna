/* eslint-disable react-refresh/only-export-components */

import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router'

import { getDiscoveryRouteState } from '@/lib/route-state'

const rootDestinations = new Set(['/', '/collection', '/groups', '/profile'])

type BackHandler = () => boolean

type BackNavigationContextValue = {
  register: (handler: BackHandler) => () => void
  consume: () => boolean
}

const BackNavigationContext = createContext<BackNavigationContextValue>({
  register: () => () => {},
  consume: () => false,
})

export function BackNavigationProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Map<number, BackHandler>())
  const nextHandlerId = useRef(0)

  const register = useCallback((handler: BackHandler) => {
    const id = nextHandlerId.current++
    handlers.current.set(id, handler)
    return () => handlers.current.delete(id)
  }, [])

  const consume = useCallback(() => {
    const registeredHandlers = [...handlers.current.values()].reverse()
    return registeredHandlers.some((handler) => handler())
  }, [])

  const value = useMemo(() => ({ register, consume }), [consume, register])

  return (
    <BackNavigationContext.Provider value={value}>
      {children}
    </BackNavigationContext.Provider>
  )
}

export function useBackHandler(
  handler: BackHandler,
  enabled = true,
): void {
  const { register } = useContext(BackNavigationContext)
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) return
    return register(() => handlerRef.current())
  }, [enabled, register])
}

export function useAppBack(): (canGoBack?: boolean) => boolean {
  const { consume } = useContext(BackNavigationContext)
  const location = useLocation()
  const navigate = useNavigate()

  return useCallback(
    (canGoBack = false) => {
      if (consume()) return true

      const target = getBackTarget(location)
      if (target) {
        navigate(target, { replace: true })
        return true
      }

      if (isRootDestination(location.pathname)) return false
      if (!canGoBack) return false

      navigate(-1)
      return true
    },
    [consume, location, navigate],
  )
}

export function useHardwareBackNavigation(): void {
  const handleBack = useAppBack()
  const handleBackRef = useRef(handleBack)

  useEffect(() => {
    handleBackRef.current = handleBack
  }, [handleBack])

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return

    let disposed = false
    let listener: { remove: () => Promise<void> } | undefined

    void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!handleBackRef.current(canGoBack)) {
        void CapacitorApp.exitApp()
      }
    }).then((registeredListener) => {
      if (disposed) {
        void registeredListener.remove()
      } else {
        listener = registeredListener
      }
    })

    return () => {
      disposed = true
      void listener?.remove()
    }
  }, [])
}

export function getBackTarget(location: {
  pathname: string
  search?: string
  hash?: string
  state?: unknown
}): string | null {
  const routeState = getDiscoveryRouteState(location.state)
  if (routeState.backgroundLocation) {
    return formatLocation(routeState.backgroundLocation)
  }

  if (rootDestinations.has(location.pathname)) return null

  if (location.pathname === '/search' || location.pathname === '/add') {
    return location.pathname === '/add'
      ? safeInternalPath(routeState.returnTo) ?? '/'
      : '/'
  }

  if (isDiscoveryDetailPath(location.pathname)) {
    return safeInternalPath(routeState.returnTo) ?? '/collection'
  }

  if (isDiscoveryEditPath(location.pathname)) {
    const discoveryId = location.pathname.split('/')[2]
    return safeInternalPath(routeState.returnTo) ?? `/discoveries/${discoveryId}`
  }

  if (isLandmarkDetailPath(location.pathname)) {
    return safeInternalPath(getFromRouteState(location.state)) ?? '/'
  }

  if (location.pathname === '/groups/new' || location.pathname === '/groups/join') {
    return '/groups'
  }

  if (isGroupEditPath(location.pathname)) {
    return `/groups/${location.pathname.split('/')[2]}`
  }

  if (isGroupDetailPath(location.pathname)) return '/groups'

  return null
}

function isRootDestination(pathname: string): boolean {
  return rootDestinations.has(pathname)
}

function isDiscoveryDetailPath(pathname: string): boolean {
  return /^\/discoveries\/[^/]+$/.test(pathname)
}

function isDiscoveryEditPath(pathname: string): boolean {
  return /^\/discoveries\/[^/]+\/edit$/.test(pathname)
}

function isLandmarkDetailPath(pathname: string): boolean {
  return /^\/landmarks\/[^/]+$/.test(pathname)
}

function isGroupDetailPath(pathname: string): boolean {
  return /^\/groups\/[^/]+$/.test(pathname)
}

function isGroupEditPath(pathname: string): boolean {
  return /^\/groups\/[^/]+\/edit$/.test(pathname)
}

function formatLocation(location: {
  pathname: string
  search: string
  hash: string
}): string {
  return `${location.pathname}${location.search}${location.hash}`
}

function safeInternalPath(path: string | undefined): string | undefined {
  return path?.startsWith('/') ? path : undefined
}

function getFromRouteState(state: unknown): string | undefined {
  if (!state || typeof state !== 'object') return undefined
  const from = (state as { from?: unknown }).from
  return from === 'map' ? '/' : undefined
}
