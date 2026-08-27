import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { renderWithProviders } from './test/renderWithProviders'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  window.localStorage.clear()
})

function renderAt(path: string) {
  return renderWithProviders(<App />, { route: path })
}

describe('authentication pages', () => {
  it('shows the login fields and primary action', () => {
    renderAt('/login')

    expect(screen.getByRole('main')).toHaveClass(
      'sterna-auth-screen',
      'overflow-y-auto',
    )
    const heading = screen.getByRole('heading', { name: 'Welcome back' })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveClass('sterna-screen-title', 'font-sans')
    expect(heading).not.toHaveClass('font-display')
    expect(
      screen.queryByRole('img', { name: 'Sterna logo' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    )
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    const backButton = screen.getByRole('button', { name: 'Back' })
    expect(backButton).toHaveClass(
      'size-11',
      'rounded-full',
      'bg-card',
      'text-primary',
    )
    expect(
      screen.queryByRole('link', { name: 'Create an account' }),
    ).not.toBeInTheDocument()
  })

  it('shows the register fields and primary action', () => {
    renderAt('/register')

    expect(screen.getByRole('main')).toHaveClass(
      'sterna-auth-screen',
      'overflow-y-auto',
    )
    const heading = screen.getByRole('heading', {
      name: 'Create your account',
    })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveClass('sterna-screen-title', 'font-sans')
    expect(heading).not.toHaveClass('font-display')
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Log in' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Sterna logo' }),
    ).not.toBeInTheDocument()
  })

  it('navigates back from login to the welcome screen', () => {
    renderAt('/login')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(
      screen.getByRole('heading', { name: 'Keep your discoveries close' }),
    ).toBeInTheDocument()
  })

  it('navigates back from register to the welcome screen', () => {
    renderAt('/register')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(
      screen.getByRole('heading', { name: 'Keep your discoveries close' }),
    ).toBeInTheDocument()
  })

  it('skips authentication when the environment flag is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_AUTH_SKIP', 'true')

    renderAt('/auth')

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))

    expect(
      await screen.findByRole('heading', { name: 'Explore Paris' }),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem('sterna.auth')).toContain(
      'dev-skip-token',
    )
  })

  it('does not show the skip action when the environment flag is disabled', () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_ENABLE_AUTH_SKIP', 'false')

    renderAt('/auth')

    expect(
      screen.queryByRole('button', { name: 'Skip' }),
    ).not.toBeInTheDocument()
  })

  it('shows the skip action when explicitly enabled outside development', () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_ENABLE_AUTH_SKIP', 'true')

    renderAt('/auth')

    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument()
  })

  it('toggles password visibility from the password input control', () => {
    renderAt('/login')

    const passwordInput = screen.getByLabelText('Password')
    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('shows a confirmation error when register passwords do not match', () => {
    renderAt('/register')

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Explorer' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'explorer@sterna.app' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'different' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('shows an email error when login is submitted without an email', () => {
    renderAt('/login')

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
  })

  it('stores the session when login succeeds', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'test-token',
          user: {
            id: '1',
            email: 'explorer@sterna.app',
            userName: 'Explorer',
            createdAt: '2026-08-26T08:00:00.000Z',
            updatedAt: '2026-08-26T08:00:00.000Z',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    renderAt('/login')

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'explorer@sterna.app' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await screen.findByRole('heading', { name: 'Explore Paris' })
    expect(window.localStorage.getItem('sterna.auth')).toContain('test-token')
  })
})
