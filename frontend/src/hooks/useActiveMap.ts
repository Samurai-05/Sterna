import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getActiveMap, setActiveMap, type ActiveMap } from '@/lib/api'
import { loadSession } from '@/lib/session'

/**
 * The active map is the single per-user destination for new discoveries: either
 * the personal map (`groupId: null`) or one group the user belongs to.
 */
export function useActiveMap() {
  const session = loadSession()

  return useQuery({
    queryKey: ['active-map', session?.user.id],
    queryFn: () => getActiveMap(session!.accessToken),
    enabled: Boolean(session),
  })
}

export function useSetActiveMap() {
  const session = loadSession()
  const userId = session?.user.id
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string | null) =>
      setActiveMap({ accessToken: session!.accessToken, groupId }),
    onSuccess: (activeMap: ActiveMap) => {
      queryClient.setQueryData(['active-map', userId], activeMap)
      // Every summary carries its own isActive flag, and the map screen reads
      // whichever discovery list the new destination points at.
      queryClient.invalidateQueries({ queryKey: ['groups', userId] })
      queryClient.invalidateQueries({ queryKey: ['discoveries', userId] })
      queryClient.invalidateQueries({ queryKey: ['group-discoveries', userId] })
      queryClient.invalidateQueries({ queryKey: ['pois', userId] })
    },
  })
}

export function activeMapName(activeMap: ActiveMap | undefined): string {
  return activeMap?.name ?? 'Personal map'
}
