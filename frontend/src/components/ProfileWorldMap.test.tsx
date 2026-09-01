import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'
import { ProfileWorldMap } from './ProfileWorldMap'

describe('ProfileWorldMap', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { A3: 'FRA' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-5, 40],
                    [10, 40],
                    [10, 52],
                    [-5, 52],
                    [-5, 40],
                  ],
                ],
              },
            },
            {
              type: 'Feature',
              properties: { A3: 'CHE' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [5, 45],
                    [11, 45],
                    [11, 48],
                    [5, 48],
                    [5, 45],
                  ],
                ],
              },
            },
          ],
        }),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders explored and unexplored countries with static SVG styling', async () => {
    renderWithProviders(<ProfileWorldMap exploredCountryCodes={['FRA']} />)

    expect(
      await screen.findByRole('img', { name: 'World exploration map' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('profile-country-FRA')).toHaveAttribute(
      'fill',
      '#2D5A3D',
    )
    expect(screen.getByTestId('profile-country-CHE')).toHaveAttribute(
      'fill',
      '#E8E3D9',
    )
    expect(
      screen.getByText(
        'Green countries have discoveries. Warm neutral countries have not been explored yet.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('uses the shared disputed-country expansion for profile map styling', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { A3: 'XCR' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [30, 40],
                    [40, 40],
                    [40, 50],
                    [30, 50],
                    [30, 40],
                  ],
                ],
              },
            },
          ],
        }),
      }),
    )

    renderWithProviders(<ProfileWorldMap exploredCountryCodes={['UKR']} />)

    expect(await screen.findByTestId('profile-country-XCR')).toHaveAttribute(
      'fill',
      '#2D5A3D',
    )
  })

  it('hides the visualization when country geometry cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    renderWithProviders(<ProfileWorldMap exploredCountryCodes={[]} />)

    await waitFor(() => {
      expect(
        screen.queryByRole('img', { name: 'World exploration map' }),
      ).not.toBeInTheDocument()
    })
  })
})
