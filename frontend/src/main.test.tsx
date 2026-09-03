import { beforeEach, describe, expect, it, vi } from 'vitest'

const capacitorMock = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: capacitorMock.isNativePlatform,
  },
}))

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}))

vi.mock('./App.tsx', () => ({
  default: () => null,
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status = 500
  },
}))

async function loadFrontend(native: boolean) {
  document.body.innerHTML = '<div id="root"></div>'
  document.documentElement.classList.toggle('sterna-native', !native)
  capacitorMock.isNativePlatform.mockReturnValue(native)
  vi.resetModules()
  await import('./main')
}

describe('frontend bootstrap', () => {
  beforeEach(() => {
    capacitorMock.isNativePlatform.mockReset()
    document.documentElement.classList.remove('sterna-native')
  })

  it('marks the document when running in the native Capacitor runtime', async () => {
    await loadFrontend(true)

    expect(capacitorMock.isNativePlatform).toHaveBeenCalledOnce()
    expect(document.documentElement).toHaveClass('sterna-native')
  })

  it('does not mark the document in a browser runtime', async () => {
    await loadFrontend(false)

    expect(capacitorMock.isNativePlatform).toHaveBeenCalledOnce()
    expect(document.documentElement).not.toHaveClass('sterna-native')
  })
})
