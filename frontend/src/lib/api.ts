import type { AuthSession, AuthenticatedUser } from '@/lib/session'
import type {
  Discovery,
  DiscoveryCategory,
  Landmark,
} from '@/lib/mock-data'
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

export function getCurrentUser(accessToken: string): Promise<AuthenticatedUser> {
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

export async function getDiscoveries(): Promise<Discovery[]> {
  const discoveries = await request<ApiDiscovery[]>('/api/discoveries')

  return Promise.all(discoveries.map(toDiscovery))
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
    ? categoryByApiValue[discovery.category] ?? 'other'
    : 'other'
  const coordinates: [number, number] = [discovery.longitude, discovery.latitude]
  const countryCode = await findCountryCodeForPoint(coordinates)

  return {
    id: Number(discovery.id),
    name: discovery.title,
    category,
    location: `${discovery.latitude.toFixed(4)}, ${discovery.longitude.toFixed(4)}`,
    imageId: 'photo-1500530855697-b586d89ba3ee',
    description: discovery.description ?? '',
    author: `User ${discovery.userId}`,
    initials: 'U',
    relativeDate: formatRelativeDate(discovery.discoveredAt),
    coordinates,
    countryCode: countryCode ?? 'UNK',
  }
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
