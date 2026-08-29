import {
  Drama,
  Landmark,
  Mountain,
  PawPrint,
  Shapes,
  Sprout,
  Utensils,
} from 'lucide-react'

import { categoryAppearance } from '@/lib/category-appearance'
import type { DiscoveryCategory } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const icons = {
  landscape: Mountain,
  monument: Landmark,
  food: Utensils,
  animal: PawPrint,
  plant: Sprout,
  culture: Drama,
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
  return (
    <Icon
      aria-hidden="true"
      className={cn(categoryAppearance[category].icon, className)}
    />
  )
}
