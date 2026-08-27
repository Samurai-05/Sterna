/**
 * A discovery opened from a group's shared map has to be read back through the
 * group route: `GET /api/discoveries/:id` only ever returns the caller's own
 * discoveries, so another member's would answer 404. Carrying the group in the
 * URL rather than in router state keeps it across a refresh or a shared link.
 */
export function discoveryPath(
  discoveryId: number | string,
  groupId?: string | null,
): string {
  const path = `/discoveries/${discoveryId}`

  return groupId ? `${path}?group=${encodeURIComponent(groupId)}` : path
}
