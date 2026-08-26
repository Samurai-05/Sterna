import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

export function renderWithProviders(
  ui: React.ReactNode,
  {
    route = '/',
    initialEntries,
    initialIndex,
  }: {
    route?: string
    initialEntries?: React.ComponentProps<typeof MemoryRouter>['initialEntries']
    initialIndex?: number
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={initialEntries ?? [route]}
        initialIndex={initialIndex}
      >
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
