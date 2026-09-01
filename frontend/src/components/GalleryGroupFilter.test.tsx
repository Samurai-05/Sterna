import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GalleryGroupFilter } from './GalleryGroupFilter'

const longGroupName =
  'International photography enthusiasts and weekend explorers'

describe('GalleryGroupFilter', () => {
  it('uses a horizontally scrollable row and caps long group names', () => {
    const onValueChange = vi.fn()

    render(
      <GalleryGroupFilter
        groups={[
          {
            id: 'long-group',
            name: longGroupName,
            description: null,
            role: 'member',
            isActive: false,
            memberCount: 3,
            discoveryCount: 4,
          },
        ]}
        value="personal"
        personalMapName="Romain's map"
        onValueChange={onValueChange}
      />,
    )

    const filters = screen.getByRole('group', {
      name: 'Filter gallery by source',
    })
    expect(filters).toHaveClass('overflow-x-auto')
    expect(
      within(filters).getByRole('button', { name: 'All groups' }),
    ).toBeInTheDocument()
    expect(
      within(filters).getByRole('button', { name: "Romain's map" }),
    ).toHaveAttribute('aria-pressed', 'true')

    const longGroup = within(filters).getByRole('button', {
      name: longGroupName,
    })
    expect(longGroup).toHaveClass('max-w-40')
    expect(longGroup).toHaveAttribute('title', longGroupName)
    expect(longGroup.querySelector('span:last-child')).toHaveClass('truncate')

    fireEvent.click(longGroup)
    expect(onValueChange).toHaveBeenCalledWith('long-group')
  })
})
