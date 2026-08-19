import { useQuery } from '@tanstack/react-query'
import { getDiscoveries } from '../api/discoveries'

export default function DataPage() {
  const { data, error, isFetching, isLoading, refetch } = useQuery({
    queryKey: ['discoveries'],
    queryFn: getDiscoveries,
  })

  return (
    <main>
      <h1>Discoveries</h1>

      <button type="button" onClick={() => void refetch()} disabled={isFetching}>
        {isFetching ? 'Loading…' : 'Refetch'}
      </button>

      {isLoading && <p>Loading discoveries…</p>}

      {error instanceof Error && <p role="alert">Error: {error.message}</p>}

      {data && (
        <ul>
          {data.map((discovery) => (
            <li key={discovery.id}>
              {discovery.name} — {discovery.latitude}, {discovery.longitude}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
