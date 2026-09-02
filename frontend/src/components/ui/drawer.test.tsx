import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DrawerSwipeHandle } from './drawer'

describe('DrawerSwipeHandle', () => {
  it('uses the full sheet width as its interactive area while centering the grabber', () => {
    render(<DrawerSwipeHandle aria-label="Resize drawer" onClick={() => {}} />)

    const handle = screen.getByRole('button', { name: 'Resize drawer' })

    expect(handle).toHaveClass('w-full', 'justify-center', 'touch-none')
    expect(handle.firstElementChild).toHaveClass('w-10')
  })
})
