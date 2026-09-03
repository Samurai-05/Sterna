import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

export function renderWithProviders(
  ui: React.ReactNode,
  {
    route = '/',
    initialEntries,
    initialIndex,
    strictMode = false,
  }: {
    route?: string
    initialEntries?: React.ComponentProps<typeof MemoryRouter>['initialEntries']
    initialIndex?: number
    strictMode?: boolean
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const content = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={initialEntries ?? [route]}
        initialIndex={initialIndex}
      >
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )

  return render(strictMode ? <StrictMode>{content}</StrictMode> : content)
}
