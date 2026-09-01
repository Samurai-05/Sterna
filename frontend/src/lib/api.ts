import type { AuthSession, AuthenticatedUser } from '@/lib/session'
import type { Discovery, DiscoveryCategory, Landmark } from '@/lib/mock-data'
import type { PersistedLocationSource } from './discovery-location'
import { getCountryName } from '@/lib/countries'

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

/** Resolves API paths for both same-origin web builds and Capacitor builds. */
export function resolveApiUrl(path: string, baseUrl = apiBaseUrl): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

async function request<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(resolveApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw await responseError(response)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return responseJson<TResponse>(response)
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

export function deleteAccount(
  accessToken: string,
  currentPassword: string,
): Promise<void> {
  return request<void>('/api/auth/me', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ currentPassword }),
  })
}

export function updateProfile(input: {
  accessToken: string
  userName?: string
  avatarObjectKey?: string | null
}): Promise<AuthenticatedUser> {
  const changes: { userName?: string; avatarObjectKey?: string | null } = {}
  if (input.userName !== undefined) changes.userName = input.userName
  if (input.avatarObjectKey !== undefined) {
    changes.avatarObjectKey = input.avatarObjectKey
  }

  return request<AuthenticatedUser>('/api/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify(changes),
  })
}

export function changePassword(input: {
  accessToken: string
  currentPassword: string
  newPassword: string
}): Promise<void> {
  return request<void>('/api/auth/password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    }),
  })
}

interface ApiDiscovery {
  id: string
  userId: string
  groupId: string | null
  groupIds?: string[]
  personal?: boolean
  title: string
  description: string | null
  category: string | null
  longitude: number
  latitude: number
  imageObjectKey: string
  locationSource?: PersistedLocationSource | null
  authorUserName?: string
  countryCode: string | null
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
  countryCode: string | null
  imageUrl: string | null
  discovered: boolean
}

export interface UploadPhotoResponse {
  objectKey: string
  url: string
  metadata?: {
    location: {
      latitude: number
      longitude: number
    } | null
    takenAt: string | null
  }
  /** Compatibility with API responses from before metadata was split. */
  exif?: {
    latitude: number
    longitude: number
    takenAt?: string | null
  } | null
}

export type PhotoVariant = 'map' | 'card' | 'detail'

export interface LocationSearchResult {
  id: string
  label: string
  type: string
  longitude: number
  latitude: number
  zoom: number
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

  // Keep the personal-map boundary on the client as well as in the API.
  return discoveries
    .filter((discovery) => discovery.personal ?? discovery.groupId === null)
    .map(toDiscovery)
}

export async function getAuthoredDiscoveries(
  accessToken: string,
): Promise<Discovery[]> {
  const discoveries = await request<ApiDiscovery[]>(
    '/api/discoveries/authored',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  return discoveries.map(toDiscovery)
}

export async function getAllGroupDiscoveries(
  accessToken: string,
): Promise<Discovery[]> {
  const discoveries = await request<ApiDiscovery[]>('/api/discoveries/groups', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return discoveries.map(toDiscovery)
}

export function searchLocations(
  accessToken: string,
  query: string,
): Promise<LocationSearchResult[]> {
  return request<LocationSearchResult[]>(
    `/api/geocoding/search?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
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
  groupIds: string[]
  personal: boolean
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
        groupIds: input.groupIds,
        personal: input.personal,
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

  const response = await fetch(resolveApiUrl('/api/photos'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })

  if (!response.ok) {
    throw await responseError(response)
  }

  return responseJson<UploadPhotoResponse>(response)
}

export async function getPhoto(
  accessToken: string,
  imageObjectKey: string,
  variant?: PhotoVariant,
): Promise<Blob> {
  const filename = imageObjectKey.split('/').at(-1)
  if (!filename) throw new Error('Invalid photo key.')

  const cacheKey = `${accessToken}\0${imageObjectKey}\0${variant ?? 'original'}`
  const cached = photoRequestCache.get(cacheKey)
  if (cached) return cached

  const query = variant ? `?variant=${encodeURIComponent(variant)}` : ''
  const requestPromise = fetch(
    resolveApiUrl(`/api/photos/${encodeURIComponent(filename)}${query}`),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  ).then(async (response) => {
    if (!response.ok) {
      throw await responseError(response)
    }

    return response.blob()
  })

  photoRequestCache.set(cacheKey, requestPromise)
  void requestPromise.then(
    () => {
      if (photoRequestCache.get(cacheKey) === requestPromise) {
        photoRequestCache.delete(cacheKey)
      }
    },
    () => {
      if (photoRequestCache.get(cacheKey) === requestPromise) {
        photoRequestCache.delete(cacheKey)
      }
    },
  )

  return requestPromise
}

const photoRequestCache = new Map<string, Promise<Blob>>()

export async function getPois(accessToken: string): Promise<Landmark[]> {
  const pois = await request<ApiPoi[]>('/api/pois', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  return pois.map(toLandmark)
}

export async function getAuthoredPois(
  accessToken: string,
): Promise<Landmark[]> {
  const pois = await request<ApiPoi[]>('/api/pois/authored', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  return pois.map(toLandmark)
}

export async function createDiscovery(input: {
  accessToken: string
  groupId: string | null
  groupIds: string[]
  personal: boolean
  title: string
  description: string | null
  category: DiscoveryCategory
  longitude: number
  latitude: number
  imageObjectKey: string
  locationSource: PersistedLocationSource
  discoveredAt: string
}): Promise<Discovery> {
  const discovery = await request<ApiDiscovery>('/api/discoveries', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      groupId: input.groupId,
      groupIds: input.groupIds,
      personal: input.personal,
      title: input.title,
      description: input.description,
      category: apiValueByCategory[input.category],
      longitude: input.longitude,
      latitude: input.latitude,
      imageObjectKey: input.imageObjectKey,
      locationSource: input.locationSource,
      discoveredAt: input.discoveredAt,
    }),
  })

  return toDiscovery(discovery)
}

function toDiscovery(discovery: ApiDiscovery): Discovery {
  const authorName = discovery.authorUserName ?? `User ${discovery.userId}`
  const category = discovery.category
    ? (categoryByApiValue[discovery.category] ?? 'other')
    : 'other'
  const coordinates: [number, number] = [
    discovery.longitude,
    discovery.latitude,
  ]

  return {
    id: Number(discovery.id),
    groupId: discovery.groupId,
    groupIds:
      discovery.groupIds ?? (discovery.groupId ? [discovery.groupId] : []),
    personal: discovery.personal ?? discovery.groupId === null,
    userId: discovery.userId,
    name: discovery.title,
    category,
    location: `${discovery.latitude.toFixed(4)}, ${discovery.longitude.toFixed(4)}`,
    imageId: 'photo-1500530855697-b586d89ba3ee',
    imageObjectKey: discovery.imageObjectKey,
    locationSource: discovery.locationSource ?? null,
    description: discovery.description ?? '',
    author: authorName,
    initials: initialsOf(authorName),
    relativeDate: formatRelativeDate(discovery.discoveredAt),
    createdAt: discovery.createdAt,
    coordinates,
    // PostGIS-derived (issue #59 / ADR-005) — see DiscoveriesService for how
    // a coastal point that misses every polygon still resolves to the
    // nearest country instead of going unmatched.
    countryCode: discovery.countryCode ?? 'UNK',
  }
}

async function responseError(response: Response): Promise<ApiError> {
  let message = response.statusText || 'Something went wrong.'
  const text = await response.text()

  try {
    const body = JSON.parse(text) as ApiErrorBody
    if (Array.isArray(body.message)) message = body.message.join(' ')
    else if (body.message) message = body.message
  } catch {
    if (isHtml(text)) {
      message =
        'The API returned HTML instead of JSON. Check the API URL and reverse proxy configuration.'
    }
  }

  return new ApiError(message, response.status)
}

async function responseJson<TResponse>(response: Response): Promise<TResponse> {
  const text = await response.text()

  try {
    return JSON.parse(text) as TResponse
  } catch {
    const message = isHtml(text)
      ? 'The API returned HTML instead of JSON. Check the API URL and reverse proxy configuration.'
      : 'The API returned invalid JSON.'
    throw new ApiError(message, response.status)
  }
}

function isHtml(text: string): boolean {
  const normalized = text.trimStart().toLowerCase()
  return (
    normalized.startsWith('<!doctype html') || normalized.startsWith('<html')
  )
}

function toLandmark(poi: ApiPoi): Landmark {
  return {
    id: poi.id,
    name: poi.title,
    city: '',
    country: getCountryName(poi.countryCode) ?? '',
    imageId: 'photo-1502602898657-3e91760cbb34',
    imageUrl: poi.imageUrl ?? undefined,
    description: poi.description ?? '',
    discovered: poi.discovered,
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

export type GroupRole = 'owner' | 'member'

export interface GroupMember {
  userId: string
  userName: string
  role: GroupRole
  joinedAt: string
}

export interface GroupSummary {
  id: string
  name: string
  description: string | null
  role: GroupRole
  isActive: boolean
  memberCount: number
  discoveryCount: number
}

export interface GroupDetail extends GroupSummary {
  inviteCode: string
  members: GroupMember[]
  createdAt: string
}

export interface ActiveMap {
  groupId: string | null
  name: string | null
}

export function getGroups(accessToken: string): Promise<GroupSummary[]> {
  return request<GroupSummary[]>('/api/groups', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function getGroup(
  accessToken: string,
  groupId: string,
): Promise<GroupDetail> {
  return request<GroupDetail>(`/api/groups/${groupId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function createGroup(input: {
  accessToken: string
  name: string
  description: string | null
}): Promise<GroupDetail> {
  return request<GroupDetail>('/api/groups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
    }),
  })
}

export function updateGroup(input: {
  accessToken: string
  groupId: string
  name?: string
  description?: string | null
}): Promise<GroupDetail> {
  const changes: { name?: string; description?: string | null } = {}
  if (input.name !== undefined) changes.name = input.name
  if (input.description !== undefined) changes.description = input.description

  return request<GroupDetail>(`/api/groups/${input.groupId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify(changes),
  })
}

export function deleteGroup(
  accessToken: string,
  groupId: string,
): Promise<void> {
  return request<void>(`/api/groups/${groupId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function leaveGroup(
  accessToken: string,
  groupId: string,
): Promise<void> {
  return request<void>(`/api/groups/${groupId}/members/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function joinGroup(input: {
  accessToken: string
  inviteCode: string
}): Promise<GroupDetail> {
  return request<GroupDetail>('/api/groups/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({ inviteCode: input.inviteCode }),
  })
}

export async function getGroupDiscoveries(
  accessToken: string,
  groupId: string,
): Promise<Discovery[]> {
  const discoveries = await request<ApiDiscovery[]>(
    `/api/groups/${groupId}/discoveries`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  // Keep the group boundary on the client too: only discoveries explicitly
  // saved or shared to this group may be rendered on its map.
  return discoveries
    .filter((discovery) =>
      (
        discovery.groupIds ?? (discovery.groupId ? [discovery.groupId] : [])
      ).includes(groupId),
    )
    .map(toDiscovery)
}

export function getActiveMap(accessToken: string): Promise<ActiveMap> {
  return request<ActiveMap>('/api/active-map', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function setActiveMap(input: {
  accessToken: string
  groupId: string | null
}): Promise<ActiveMap> {
  return request<ActiveMap>('/api/active-map', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({ groupId: input.groupId }),
  })
}

export function initialsOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'U'
}
