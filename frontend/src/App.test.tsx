import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the map as the mobile-first entry route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Explore Paris' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add discovery' })).toHaveAttribute(
      'href',
      '/add',
    )
  })

  it('renders the collection through its application route', () => {
    render(
      <MemoryRouter initialEntries={['/collection']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your discoveries' }),
    ).toBeInTheDocument()
  })
})
