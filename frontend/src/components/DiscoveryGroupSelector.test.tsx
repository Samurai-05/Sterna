import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DiscoveryGroupSelector } from './DiscoveryGroupSelector'
import type { GroupSummary } from '@/lib/api'

const groups: GroupSummary[] = [
  {
    id: '7',
    name: 'Paris Weekend',
    description: null,
    role: 'member',
    isActive: true,
    memberCount: 2,
    discoveryCount: 1,
  },
  {
    id: '8',
    name: 'Nature Walk',
    description: null,
    role: 'owner',
    isActive: false,
    memberCount: 3,
    discoveryCount: 4,
  },
]

describe('DiscoveryGroupSelector', () => {
  it('adds and removes optional group destinations', () => {
    const onChange = vi.fn()
    const onPersonalChange = vi.fn()
    const view = render(
      <DiscoveryGroupSelector
        groups={groups}
        selectedGroupIds={[]}
        personalSelected={false}
        onPersonalChange={onPersonalChange}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add to Nature Walk' }))
    expect(onChange).toHaveBeenLastCalledWith(['8'])

    view.rerender(
      <DiscoveryGroupSelector
        groups={groups}
        selectedGroupIds={['8']}
        personalSelected
        onPersonalChange={onPersonalChange}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add to Nature Walk' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('shows the personal map and toggles it independently', () => {
    const onPersonalChange = vi.fn()
    render(
      <DiscoveryGroupSelector
        groups={groups}
        selectedGroupIds={[]}
        personalSelected={false}
        onPersonalChange={onPersonalChange}
        onChange={vi.fn()}
      />,
    )

    const personalMap = screen.getByRole('button', {
      name: 'Add to Personal map',
    })
    expect(personalMap.parentElement).toHaveClass('overflow-x-auto')
    fireEvent.click(personalMap)
    expect(onPersonalChange).toHaveBeenCalledWith(true)
  })

  it('never allows the last destination to be removed', () => {
    const onChange = vi.fn()
    const onPersonalChange = vi.fn()
    const view = render(
      <DiscoveryGroupSelector
        groups={groups}
        selectedGroupIds={['7']}
        personalSelected={false}
        onPersonalChange={onPersonalChange}
        onChange={onChange}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Add to Paris Weekend' }),
    )
    expect(onChange).not.toHaveBeenCalled()

    view.rerender(
      <DiscoveryGroupSelector
        groups={groups}
        selectedGroupIds={[]}
        personalSelected
        onPersonalChange={onPersonalChange}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add to Personal map' }))
    expect(onPersonalChange).not.toHaveBeenCalled()
  })
})
