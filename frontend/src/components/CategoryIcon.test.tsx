import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CategoryIcon } from './CategoryIcon'
import { categoryAppearance } from '@/lib/category-appearance'
import { categories } from '@/lib/mock-data'

describe('CategoryIcon', () => {
  it('uses a distinct shared color for every discovery category', () => {
    render(
      <>
        {categories.map((category) => (
          <span key={category.id} data-testid={category.id}>
            <CategoryIcon category={category.id} />
          </span>
        ))}
      </>,
    )

    const appliedColors = categories.map((category) => {
      const icon = screen.getByTestId(category.id).querySelector('svg')
      expect(icon).toHaveClass(categoryAppearance[category.id].icon)
      return categoryAppearance[category.id].icon
    })

    expect(new Set(appliedColors)).toHaveProperty('size', categories.length)
  })
})
