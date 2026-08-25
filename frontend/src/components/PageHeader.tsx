import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'

export function PageHeader({
  title,
  backTo,
  action,
}: {
  title: string
  backTo?: string
  action?: React.ReactNode
}) {
  const navigate = useNavigate()

  return (
    <header className="flex min-h-14 items-center justify-between gap-3 px-5 py-3">
      {backTo ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          onClick={() => navigate(backTo)}
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Button>
      ) : (
        <span className="size-11" aria-hidden="true" />
      )}
      <h1 className="font-display text-[22px] font-semibold leading-7 text-foreground">
        {title}
      </h1>
      <span className="flex min-w-11 justify-end">{action}</span>
    </header>
  )
}
