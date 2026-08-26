import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'
import { renderWithProviders } from './test/renderWithProviders'

describe('App', () => {
  it('renders the welcome screen at the authentication entry route', () => {
    renderWithProviders(<App />, { route: '/auth' })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Keep your discoveries close',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/register')
    const loginLink = screen.getByRole('link', { name: 'Log in' })
    expect(loginLink).toHaveAttribute('href', '/login')
    expect(loginLink).toHaveClass('!bg-white')
    expect(loginLink).not.toHaveClass('backdrop-blur-sm')
    expect(screen.getByRole('img', { name: 'Sterna logo' })).toBeInTheDocument()
    expect(screen.getByText('Sterna', { selector: 'span' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Aerial coastline with a coastal road',
      }),
    ).toBeInTheDocument()
  })

  it('navigates from the welcome screen to register', () => {
    renderWithProviders(<App />, { route: '/auth' })

    fireEvent.click(screen.getByRole('link', { name: 'Create an account' }))
    expect(
      screen.getByRole('heading', { name: 'Create your account' }),
    ).toBeInTheDocument()
  })

  it('navigates from the welcome screen to login', () => {
    renderWithProviders(<App />, { route: '/auth' })
    fireEvent.click(screen.getByRole('link', { name: 'Log in' }))
    expect(
      screen.getByRole('heading', { name: 'Welcome back' }),
    ).toBeInTheDocument()
  })

  it('renders the map at the application root route', () => {
    renderWithProviders(<App />, { route: '/' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Explore Paris' }),
    ).toBeInTheDocument()
  })

  it('renders the collection through its application route', () => {
    renderWithProviders(<App />, { route: '/collection' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your discoveries' }),
    ).toBeInTheDocument()
  })
})
