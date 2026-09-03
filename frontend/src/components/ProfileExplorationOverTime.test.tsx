import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ProfileExplorationMonth } from '@/lib/profile-analytics'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ProfileExplorationOverTime } from './ProfileExplorationOverTime'

const months: ProfileExplorationMonth[] = [
  { key: '2026-04', label: 'Apr', count: 0 },
  { key: '2026-05', label: 'May', count: 1 },
  { key: '2026-06', label: 'Jun', count: 0 },
  { key: '2026-07', label: 'Jul', count: 2 },
  { key: '2026-08', label: 'Aug', count: 0 },
  { key: '2026-09', label: 'Sep', count: 1 },
]

describe('ProfileExplorationOverTime', () => {
  it('renders a compact accessible exploration graph', () => {
    const { container } = renderWithProviders(
      <ProfileExplorationOverTime months={months} />,
    )

    expect(
      screen.getByRole('region', { name: 'Exploration over time' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Discoveries by month:/ }),
    ).toBeInTheDocument()
    expect(container.querySelector('polyline')).toBeInTheDocument()
  })
})
