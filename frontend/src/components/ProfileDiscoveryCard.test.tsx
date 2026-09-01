import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Discovery } from '@/lib/mock-data'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ProfileDiscoveryCard } from './ProfileDiscoveryCard'

const discovery: Discovery = {
  id: 7,
  groupId: 'group-1',
  groupIds: ['group-1'],
  personal: false,
  name: 'Alpine meadow',
  category: 'landscape',
  location: '46.7000, 6.6000',
  imageId: 'fallback',
  description: '',
  author: 'Explorer',
  initials: 'E',
  relativeDate: 'today',
  coordinates: [6.6, 46.7],
  countryCode: 'CHE',
}

describe('ProfileDiscoveryCard', () => {
  it('uses a concise accessible link name and treats the photo as supporting content', () => {
    const { container } = renderWithProviders(
      <ProfileDiscoveryCard discovery={discovery} />,
    )

    expect(
      screen.getByRole('link', { name: 'Alpine meadow, Switzerland' }),
    ).toHaveAttribute('href', '/discoveries/7?group=group-1')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('omits the date line when the real-world date is unavailable', () => {
    renderWithProviders(
      <ProfileDiscoveryCard
        discovery={{ ...discovery, discoveredAt: 'invalid' }}
      />,
    )

    expect(screen.queryByText('Date not set')).not.toBeInTheDocument()
  })
})
