import type { AuthSession, AuthenticatedUser } from '@/lib/session'
import type { Discovery, DiscoveryCategory, Landmark } from '@/lib/mock-data'
import { findCountryCodeForPoint } from '@/lib/countries'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

interface ApiErrorBody {
  message?: string | string[]
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = 'Something went wrong.'

    try {
      const body = (await response.json()) as ApiErrorBody
      if (Array.isArray(body.message)) {
        message = body.message.join(' ')
      } else if (body.message) {
        message = body.message
      }
    } catch {
      message = response.statusText
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

export function register(input: {
  email: string
  password: string
  userName: string
}): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function login(input: {
  email: string
  password: string
}): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getCurrentUser(
  accessToken: string,
): Promise<AuthenticatedUser> {
  return request<AuthenticatedUser>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

interface ApiDiscovery {
  id: string
  userId: string
  groupId: string | null
  title: string
  description: string | null
  category: string | null
  longitude: number
  latitude: number
  imageObjectKey: string
  discoveredAt: string
  createdAt: string
  updatedAt: string
}

interface ApiPoi {
  id: string
  title: string
  description: string | null
  longitude: number
  latitude: number
  imageUrl: string | null
}

interface UploadPhotoResponse {
  objectKey: string
  url: string
  exif: {
    latitude: number
    longitude: number
    takenAt: string | null
  } | null
}

const categoryByApiValue: Record<string, DiscoveryCategory> = {
  Landscape: 'landscape',
  Monument: 'monument',
  Food: 'food',
  Animal: 'animal',
  Plant: 'plant',
  Culture: 'culture',
  Other: 'other',
}

const apiValueByCategory: Record<DiscoveryCategory, string> = {
  landscape: 'Landscape',
  monument: 'Monument',
  food: 'Food',
  animal: 'Animal',
  plant: 'Plant',
  culture: 'Culture',
  other: 'Other',
}

export async function getDiscoveries(
  accessToken: string,
): Promise<Discovery[]> {
  const discoveries = await request<ApiDiscovery[]>('/api/discoveries', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return Promise.all(discoveries.map(toDiscovery))
}

export async function getDiscovery(
  accessToken: string,
  discoveryId: string,
): Promise<Discovery> {
  const discovery = await request<ApiDiscovery>(
    `/api/discoveries/${discoveryId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  return toDiscovery(discovery)
}

export async function updateDiscovery(input: {
  accessToken: string
  discoveryId: string
  title: string
  description: string | null
  category: DiscoveryCategory
  longitude: number
  latitude: number
}): Promise<Discovery> {
  const discovery = await request<ApiDiscovery>(
    `/api/discoveries/${input.discoveryId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${input.accessToken}` },
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        category: apiValueByCategory[input.category],
        longitude: input.longitude,
        latitude: input.latitude,
      }),
    },
  )

  return toDiscovery(discovery)
}

export function deleteDiscovery(
  accessToken: string,
  discoveryId: string,
): Promise<void> {
  return request<void>(`/api/discoveries/${discoveryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function uploadPhoto(
  accessToken: string,
  photo: Blob,
  fileName: string,
): Promise<UploadPhotoResponse> {
  const formData = new FormData()
  formData.append('file', photo, fileName)

  const response = await fetch(`${apiBaseUrl}/api/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })

  if (!response.ok) {
    throw await responseError(response)
  }

  return (await response.json()) as UploadPhotoResponse
}

export async function getPhoto(
  accessToken: string,
  imageObjectKey: string,
): Promise<Blob> {
  const filename = imageObjectKey.split('/').at(-1)
  if (!filename) throw new Error('Invalid photo key.')

  const response = await fetch(
    `${apiBaseUrl}/api/photos/${encodeURIComponent(filename)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!response.ok) {
    throw await responseError(response)
  }

  return response.blob()
}

export async function getPois(): Promise<Landmark[]> {
  const pois = await request<ApiPoi[]>('/api/pois')

  return pois.map(toLandmark)
}

export async function createDiscovery(input: {
  accessToken: string
  title: string
  description: string | null
  category: DiscoveryCategory
  longitude: number
  latitude: number
  imageObjectKey: string
  discoveredAt: string
}): Promise<Discovery> {
  const discovery = await request<ApiDiscovery>('/api/discoveries', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      groupId: null,
      title: input.title,
      description: input.description,
      category: apiValueByCategory[input.category],
      longitude: input.longitude,
      latitude: input.latitude,
      imageObjectKey: input.imageObjectKey,
      discoveredAt: input.discoveredAt,
    }),
  })

  return toDiscovery(discovery)
}

async function toDiscovery(discovery: ApiDiscovery): Promise<Discovery> {
  const category = discovery.category
    ? (categoryByApiValue[discovery.category] ?? 'other')
    : 'other'
  const coordinates: [number, number] = [
    discovery.longitude,
    discovery.latitude,
  ]
  const countryCode = await findCountryCodeForPoint(coordinates)

  return {
    id: Number(discovery.id),
    name: discovery.title,
    category,
    location: `${discovery.latitude.toFixed(4)}, ${discovery.longitude.toFixed(4)}`,
    imageId: 'photo-1500530855697-b586d89ba3ee',
    imageObjectKey: discovery.imageObjectKey,
    description: discovery.description ?? '',
    author: `User ${discovery.userId}`,
    initials: 'U',
    relativeDate: formatRelativeDate(discovery.discoveredAt),
    coordinates,
    countryCode: countryCode ?? 'UNK',
  }
}

async function responseError(response: Response): Promise<ApiError> {
  let message = response.statusText || 'Something went wrong.'

  try {
    const body = (await response.json()) as ApiErrorBody
    if (Array.isArray(body.message)) message = body.message.join(' ')
    else if (body.message) message = body.message
  } catch {
    // Non-JSON errors keep the HTTP status text.
  }

  return new ApiError(message, response.status)
}

function toLandmark(poi: ApiPoi): Landmark {
  return {
    id: poi.id,
    name: poi.title,
    city: '',
    country: '',
    imageId: 'photo-1502602898657-3e91760cbb34',
    description: poi.description ?? '',
    discovered: false,
    coordinates: [poi.longitude, poi.latitude],
  }
}

function formatRelativeDate(value: string): string {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return '1d ago'

  return `${diffDays}d ago`
}
