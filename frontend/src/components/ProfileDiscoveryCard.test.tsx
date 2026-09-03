import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Discovery } from '@/lib/mock-data'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ProfileDiscoveryCard } from './ProfileDiscoveryCard'

const discovery: Discovery = {
  id: 7,
  name: 'Alpine meadow',
  category: 'landscape',
  location: '46.7000, 6.6000',
  imageId: 'fallback',
  description: '',
  author: 'Explorer',
  initials: 'E',
  relativeDate: 'today',
  createdAt: '2026-08-12T00:00:00.000Z',
  coordinates: [6.6, 46.7],
  countryCode: 'CHE',
}

describe('ProfileDiscoveryCard', () => {
  it('links to a discovery with a concise accessible name and date', () => {
    const { container } = renderWithProviders(
      <ProfileDiscoveryCard discovery={discovery} />,
    )

    expect(
      screen.getByRole('link', { name: 'Alpine meadow, Switzerland' }),
    ).toHaveAttribute('href', '/discoveries/7')
    expect(screen.getByText('Aug 12, 2026')).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('omits the date when the current API timestamp is unavailable', () => {
    renderWithProviders(
      <ProfileDiscoveryCard
        discovery={{ ...discovery, createdAt: 'invalid' }}
      />,
    )

    expect(screen.queryByText('Date not set')).not.toBeInTheDocument()
  })
})
