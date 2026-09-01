export type DiscoveryCategory =
  'landscape' | 'monument' | 'food' | 'animal' | 'plant' | 'culture' | 'other'

export interface Discovery {
  id: number
  /** Absent on the local sample fixtures, always set on API data. */
  userId?: string
  /** Original destination; null means the personal map. */
  groupId?: string | null
  /** Every group map this discovery is shared with. */
  groupIds?: string[]
  /** Whether the discovery also appears on its author's personal map. */
  personal?: boolean
  name: string
  category: DiscoveryCategory | null
  location: string
  imageId: string
  imageObjectKey?: string
  locationSource?: 'exif' | 'current_gps' | 'manual' | null
  description: string
  author: string
  initials: string
  relativeDate: string
  /** Creation timestamp returned by the API; absent from local demo fixtures. */
  createdAt?: string
  /** Real-world timestamp for when the discovery was made. */
  discoveredAt?: string
  coordinates: [number, number]
  countryCode: string
}

export interface Landmark {
  id: string
  name: string
  city: string
  country: string
  imageId: string
  imageUrl?: string
  description: string
  discovered: boolean
  coordinates: [number, number]
}

export const categories: Array<{
  id: DiscoveryCategory
  label: string
}> = [
  { id: 'landscape', label: 'Landscape' },
  { id: 'monument', label: 'Monument' },
  { id: 'food', label: 'Food' },
  { id: 'animal', label: 'Animal' },
  { id: 'plant', label: 'Plant' },
  { id: 'culture', label: 'Culture' },
  { id: 'other', label: 'Other' },
]

export const discoveries: Discovery[] = [
  {
    id: 1,
    name: 'Street in Le Marais',
    category: 'landscape',
    location: 'Le Marais, Paris, France',
    imageId: 'photo-1673688242391-9621b733fad0',
    description:
      'A quiet Parisian street in Le Marais, lined with historic façades, balconies and bicycles under the afternoon light.',
    author: 'Emma',
    initials: 'E',
    relativeDate: '2h ago',
    coordinates: [2.3622, 48.8586],
    countryCode: 'FRA',
  },
  {
    id: 2,
    name: 'Parisian Croissant',
    category: 'food',
    location: 'Le Marais, Paris, France',
    imageId: 'photo-1555507036-ab1f4038808a',
    description:
      'A warm, buttery croissant from a small neighbourhood bakery in Le Marais.',
    author: 'Marc',
    initials: 'M',
    relativeDate: '4h ago',
    coordinates: [2.3608, 48.8598],
    countryCode: 'FRA',
  },
  {
    id: 3,
    name: 'Louvre Courtyard',
    category: 'monument',
    location: 'Louvre Museum, Paris, France',
    imageId: 'photo-1567942585146-33d62b775db0',
    description: 'The Louvre courtyard just before the evening crowds arrived.',
    author: 'Emma',
    initials: 'E',
    relativeDate: '6h ago',
    coordinates: [2.3364, 48.8606],
    countryCode: 'FRA',
  },
  {
    id: 4,
    name: 'Sacré-Cœur in Montmartre',
    category: 'monument',
    location: 'Montmartre, Paris, France',
    imageId: 'photo-1617699218704-30157bf2b0b6',
    description:
      'The white basilica of Sacré-Cœur seen from the streets of Montmartre.',
    author: 'Lucas',
    initials: 'L',
    relativeDate: '1d ago',
    coordinates: [2.3431, 48.8867],
    countryCode: 'FRA',
  },
  {
    id: 5,
    name: 'Flowers at Luxembourg Gardens',
    category: 'plant',
    location: 'Jardin du Luxembourg, Paris, France',
    imageId: 'photo-1532211387405-12202cb81d7b',
    description: 'Colourful flowers in the Luxembourg Gardens.',
    author: 'Emma',
    initials: 'E',
    relativeDate: '1d ago',
    coordinates: [2.3364, 48.8462],
    countryCode: 'FRA',
  },
  {
    id: 6,
    name: 'Red Fox in Bois de Boulogne',
    category: 'animal',
    location: 'Bois de Boulogne, Paris, France',
    imageId: 'photo-1551725301-5183dc1dbb83',
    description: 'A red fox spotted at the edge of a wooded path.',
    author: 'Lucas',
    initials: 'L',
    relativeDate: '2d ago',
    coordinates: [2.2431, 48.8637],
    countryCode: 'FRA',
  },
]

export const exploredCountryCodes = [
  ...new Set(discoveries.map((discovery) => discovery.countryCode)),
]

export const landmarks: Landmark[] = [
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    imageId: 'photo-1502602898657-3e91760cbb34',
    description:
      'The iconic iron lattice tower on the Champ de Mars, completed for the World’s Fair.',
    discovered: true,
    coordinates: [2.2945, 48.8584],
  },
  {
    id: 'arc-de-triomphe',
    name: 'Arc de Triomphe',
    city: 'Paris',
    country: 'France',
    imageId: 'photo-1771915958347-6729b0f38b06',
    description:
      'A monument honouring those who fought for France, standing at the centre of twelve avenues.',
    discovered: true,
    coordinates: [2.295, 48.8738],
  },
]

export function imageUrl(imageId: string, width = 800) {
  return `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=${width}&q=80`
}

export function categoryLabel(category: DiscoveryCategory | null) {
  return (
    categories.find((item) => item.id === category)?.label ?? 'Uncategorized'
  )
}
