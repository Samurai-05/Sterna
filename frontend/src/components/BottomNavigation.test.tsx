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

describe('BottomNavigation icons', () => {
  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <BottomNavigation />
      </MemoryRouter>,
    )
  }

  it('sizes the icon rather than the box around it', () => {
    const { container } = renderAt('/')

    container.querySelectorAll('nav a > span:first-child').forEach((box) => {
      expect(box).toHaveClass('[&>svg]:size-5')
      expect(box).not.toHaveClass('size-5')
    })
  })

  it('marks the active item with more than colour', () => {
    renderAt('/collection')

    const box = screen.getByRole('link', { name: 'Gallery' })
      .firstElementChild
    expect(box).toHaveClass('[&>svg]:stroke-[2.5px]')
  })

  it('gives every destination a visible focus state', () => {
    renderAt('/')

    screen.getAllByRole('link').forEach((link) => {
      expect(link).toHaveClass('focus-visible:ring-2')
    })
  })
})
