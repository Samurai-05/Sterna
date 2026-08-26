import {
  Landmark,
  Mountain,
  Palette,
  PawPrint,
  Shapes,
  Sprout,
  Utensils,
} from 'lucide-react'

import type { DiscoveryCategory } from '@/lib/mock-data'

const icons = {
  landscape: Mountain,
  monument: Landmark,
  food: Utensils,
  animal: PawPrint,
  plant: Sprout,
  culture: Palette,
  other: Shapes,
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
