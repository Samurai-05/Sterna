import {
  Camera,
  Flower2,
  Landmark,
  Leaf,
  MapPinned,
  Palette,
  Utensils,
} from 'lucide-react'

import type { DiscoveryCategory } from '@/lib/mock-data'

const icons = {
  landscape: MapPinned,
  monument: Landmark,
  food: Utensils,
  animal: Camera,
  plant: Flower2,
  culture: Palette,
  other: Leaf,
} as const

export function CategoryIcon({
  category,
  className,
}: {
  category: DiscoveryCategory
  className?: string
}) {
  const Icon = icons[category]
  return <Icon aria-hidden="true" className={className} />
}
