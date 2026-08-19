export interface Discovery {
  id: number
  name: string
  latitude: number
  longitude: number
}

export async function getDiscoveries(): Promise<Discovery[]> {
  const response = await fetch('/mock/discoveries.json')

  if (!response.ok) {
    throw new Error(`Unable to load discoveries: ${response.status}`)
  }

  return response.json() as Promise<Discovery[]>
}
