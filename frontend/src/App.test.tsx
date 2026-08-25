import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('renders the profile exploration summary and supporting details', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Profile' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Profile settings' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Open account settings' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Emma Barret')).toBeInTheDocument()
    const accountButton = screen.getByRole('button', {
      name: 'Open account settings',
    })
    const profileImage = within(accountButton).getByRole('img', {
      name: 'Emma Barret',
    })
    expect(accountButton).toHaveClass('size-[68px]')
    expect(accountButton).toHaveClass('-translate-x-2.5')
    expect(profileImage).toHaveClass('size-16', 'rounded-full', 'object-cover')
    expect(profileImage).toHaveAttribute(
      'src',
      expect.stringContaining('profile-emma'),
    )
    fireEvent.error(profileImage)
    expect(within(accountButton).getByText('E')).toBeInTheDocument()
    expect(screen.getByText('Explorer · Since March 2023')).toHaveClass('mt-2')
    expect(
      within(screen.getByLabelText('Exploration statistics')).getByText(
        'Countries',
      ).parentElement,
    ).toHaveClass('before:h-10', 'before:bg-white/15')
    expect(screen.getByText('Discoveries')).toBeInTheDocument()
    expect(screen.getByText('Countries')).toBeInTheDocument()
    expect(screen.getByText('POIs')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Street in Le Marais')).toBeInTheDocument()
    expect(
      screen.getByText('2 / 2 points of interest discovered'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Countries explored' }),
    ).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Discoveries by category',
      }),
    ).toBeInTheDocument()
  })

  it('shows each category as a labeled mobile-friendly progress row', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>,
    )

    const categorySection = screen.getByRole('region', {
      name: 'Discoveries by category',
    })
    const progressBars = within(categorySection).getAllByRole('progressbar')

    expect(progressBars).toHaveLength(5)
    expect(
      within(categorySection).getByRole('progressbar', {
        name: 'Monument discoveries: 2',
      }),
    ).toHaveAttribute('aria-valuenow', '100')
    const landscapeProgress = within(categorySection).getByRole('progressbar', {
      name: 'Landscape discoveries: 1',
    })
    expect(landscapeProgress).toHaveAttribute('aria-valuenow', '50')
    expect(landscapeProgress).toHaveAttribute(
      'aria-valuetext',
      '1 discovery in Landscape',
    )
    expect(within(categorySection).getByText('Landscape')).toBeInTheDocument()
  })

  it('links from recent discoveries to the collection', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/collection',
    )
  })

  it('groups identity and primary statistics in the profile overview', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>,
    )

    const overview = screen.getByRole('region', { name: 'Profile overview' })

    expect(within(overview).getByText('Emma Barret')).toBeInTheDocument()
    expect(within(overview).getByText('Discoveries')).toBeInTheDocument()
    expect(within(overview).getByText('Countries')).toBeInTheDocument()
    expect(within(overview).getByText('POIs')).toBeInTheDocument()
  })

  it('labels the profile destination Me in the bottom navigation', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Me' })).toHaveAttribute(
      'href',
      '/profile',
    )
    expect(
      screen.queryByRole('link', { name: 'Profile' }),
    ).not.toBeInTheDocument()
  })
})
