export type DiscoveryCategory =
  'landscape' | 'monument' | 'food' | 'animal' | 'plant' | 'culture' | 'other'

export interface Discovery {
  id: number
  name: string
  category: DiscoveryCategory
  location: string
  imageId: string
  description: string
  author: string
  initials: string
  relativeDate: string
  mapPosition: { left: string; top: string }
}

export interface Group {
  id: string
  name: string
  description: string
  members: Array<{ name: string; initials: string }>
  discoveryIds: number[]
}

export interface Landmark {
  id: string
  name: string
  city: string
  country: string
  imageId: string
  description: string
  discovered: boolean
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
    mapPosition: { left: '35%', top: '40%' },
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
    mapPosition: { left: '72%', top: '35%' },
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
    mapPosition: { left: '55%', top: '59%' },
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
    mapPosition: { left: '24%', top: '55%' },
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
    mapPosition: { left: '70%', top: '73%' },
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
    mapPosition: { left: '18%', top: '78%' },
  },
]

export const groups: Group[] = [
  {
    id: 'paris-weekend',
    name: 'Paris Weekend',
    description: 'A shared map for a weekend in Paris.',
    members: [
      { name: 'Emma', initials: 'E' },
      { name: 'Marc', initials: 'M' },
    ],
    discoveryIds: [1, 2, 3],
  },
  {
    id: 'montmartre-walk',
    name: 'Montmartre Walk',
    description: 'The steep streets, cafés and viewpoints of Montmartre.',
    members: [
      { name: 'Emma', initials: 'E' },
      { name: 'Lucas', initials: 'L' },
    ],
    discoveryIds: [4],
  },
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
  },
]

export function imageUrl(imageId: string, width = 800) {
  return `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=${width}&q=80`
}

export function categoryLabel(category: DiscoveryCategory) {
  return categories.find((item) => item.id === category)?.label ?? 'Other'
}
