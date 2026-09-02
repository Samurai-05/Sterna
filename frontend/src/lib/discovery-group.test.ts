import { describe, expect, it } from 'vitest'

import { resolveDiscoveryGroupId } from './discovery-group'

const discovery = {
  id: 123,
  groupId: 'A',
  groupIds: ['A', 'B'],
} as Parameters<typeof resolveDiscoveryGroupId>[0]

describe('resolveDiscoveryGroupId', () => {
  it('chooses an accessible membership instead of an inaccessible primary group', () => {
    expect(resolveDiscoveryGroupId(discovery, 'all-groups', null, ['B'])).toBe(
      'B',
    )
  })

  it('keeps a valid primary group when it is an accessible membership', () => {
    expect(resolveDiscoveryGroupId(discovery, 'all-groups', null, ['A'])).toBe(
      'A',
    )
  })

  it('keeps personal and explicit group routes scoped correctly', () => {
    expect(
      resolveDiscoveryGroupId(discovery, 'personal', null, ['A']),
    ).toBeNull()
    expect(resolveDiscoveryGroupId(discovery, 'group', 'B', [])).toBe('B')
  })
})
