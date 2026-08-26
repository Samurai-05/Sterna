import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { BottomNavigation } from './BottomNavigation'

describe('BottomNavigation add action', () => {
  it('invokes the photo capture action when Add is tapped', () => {
    const onAddDiscovery = vi.fn()

    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNavigation onAddDiscovery={onAddDiscovery} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add discovery' }))

    expect(onAddDiscovery).toHaveBeenCalledOnce()
  })
})
