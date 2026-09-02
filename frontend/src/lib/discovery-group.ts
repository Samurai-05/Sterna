import type { Discovery } from '@/lib/mock-data'

export function resolveDiscoveryGroupId(
  discovery: Discovery,
  gallerySource: string,
  currentGroupId: string | null,
  memberGroupIds: readonly string[] = [],
) {
  if (gallerySource === 'personal') return null
  if (gallerySource !== 'all-groups') return currentGroupId

  const membershipIds = new Set(memberGroupIds)
  const accessibleGroupId = discovery.groupIds?.find((groupId) =>
    membershipIds.has(groupId),
  )

  if (accessibleGroupId) return accessibleGroupId
  return discovery.groupId && membershipIds.has(discovery.groupId)
    ? discovery.groupId
    : null
}
