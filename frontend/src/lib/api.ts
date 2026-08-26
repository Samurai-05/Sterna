import type { AuthSession, AuthenticatedUser } from '@/lib/session'

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
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
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
}): Promise<AuthenticatedUser> {
  return request<AuthenticatedUser>('/api/users', {
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
