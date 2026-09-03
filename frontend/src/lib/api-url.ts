const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

/** Resolves API paths for both same-origin web builds and Capacitor builds. */
export function resolveApiUrl(path: string, baseUrl = apiBaseUrl): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}
