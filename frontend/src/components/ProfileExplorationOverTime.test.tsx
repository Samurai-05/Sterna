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
  it('renders a loading status while exploration activity is loading', () => {
    renderWithProviders(
      <ProfileExplorationOverTime status="loading" months={null} />,
    )

    const loading = screen.getByRole('status')
    expect(loading).toHaveTextContent('Loading exploration over time…')
  })

  it('renders an error status when exploration activity fails to load', () => {
    renderWithProviders(
      <ProfileExplorationOverTime status="error" months={null} />,
    )

    const error = screen.getByRole('status')
    expect(error).toHaveTextContent(
      'Exploration activity is temporarily unavailable.',
    )
  })

  it('renders an explicit empty state when all six months have zero discoveries', () => {
    const zeroMonths: ProfileExplorationMonth[] = [
      { key: '2026-04', label: 'Apr', count: 0 },
      { key: '2026-05', label: 'May', count: 0 },
      { key: '2026-06', label: 'Jun', count: 0 },
      { key: '2026-07', label: 'Jul', count: 0 },
      { key: '2026-08', label: 'Aug', count: 0 },
      { key: '2026-09', label: 'Sep', count: 0 },
    ]

    renderWithProviders(
      <ProfileExplorationOverTime status="ready" months={zeroMonths} />,
    )

    expect(
      screen.getByText('No discoveries recorded in the last 6 months.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders a compact accessible exploration graph when activity is present', () => {
    const { container } = renderWithProviders(
      <ProfileExplorationOverTime status="ready" months={months} />,
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
