import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import App from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('authentication pages', () => {
  it('shows the login fields and primary action', () => {
    renderAt('/login')

    const heading = screen.getByRole('heading', { name: 'Welcome back' })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveClass('sterna-screen-title', 'font-sans')
    expect(heading).not.toHaveClass('font-display')
    expect(screen.getByRole('img', { name: 'Sterna logo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    )
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows the register fields and primary action', () => {
    renderAt('/register')

    const heading = screen.getByRole('heading', {
      name: 'Create your account',
    })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveClass('sterna-screen-title', 'font-sans')
    expect(heading).not.toHaveClass('font-display')
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeInTheDocument()
  })

  it('navigates from login to register', () => {
    renderAt('/login')

    fireEvent.click(screen.getByRole('link', { name: 'Create an account' }))

    expect(
      screen.getByRole('heading', { name: 'Create your account' }),
    ).toBeInTheDocument()
  })

  it('navigates from register to login', () => {
    renderAt('/register')

    fireEvent.click(screen.getByRole('link', { name: 'Log in' }))

    expect(
      screen.getByRole('heading', { name: 'Welcome back' }),
    ).toBeInTheDocument()
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
})
