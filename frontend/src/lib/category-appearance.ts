import type { DiscoveryCategory } from '@/lib/mock-data'

export interface CategoryAppearance {
  color: string
  icon: string
  background: string
  ring: string
}

export const categoryAppearance: Record<DiscoveryCategory, CategoryAppearance> =
  {
    landscape: {
      color: '#2563EB',
      icon: 'text-[#2563EB]',
      background: 'bg-[#DBEAFE]',
      ring: 'ring-[#2563EB]',
    },
    monument: {
      color: '#BE123C',
      icon: 'text-[#BE123C]',
      background: 'bg-[#FFE4E6]',
      ring: 'ring-[#BE123C]',
    },
    food: {
      color: '#EA580C',
      icon: 'text-[#EA580C]',
      background: 'bg-[#FFEDD5]',
      ring: 'ring-[#EA580C]',
    },
    animal: {
      color: '#0891B2',
      icon: 'text-[#0891B2]',
      background: 'bg-[#CFFAFE]',
      ring: 'ring-[#0891B2]',
    },
    plant: {
      color: '#16A34A',
      icon: 'text-[#16A34A]',
      background: 'bg-[#DCFCE7]',
      ring: 'ring-[#16A34A]',
    },
    culture: {
      color: '#7C3AED',
      icon: 'text-[#7C3AED]',
      background: 'bg-[#EDE9FE]',
      ring: 'ring-[#7C3AED]',
    },
    other: {
      color: '#475569',
      icon: 'text-[#475569]',
      background: 'bg-[#F1F5F9]',
      ring: 'ring-[#475569]',
    },
  }

export const poiAppearance: CategoryAppearance = {
  color: '#EAB308',
  icon: 'text-[#A16207]',
  background: 'bg-[#FEF9C3]',
  ring: 'ring-[#EAB308]',
}
