import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  backTo,
  onBack,
  action,
  className,
  titleClassName,
}: {
  title: string
  backTo?: string
  onBack?: () => void
  action?: React.ReactNode
  className?: string
  titleClassName?: string
}) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sterna-page-header flex min-h-14 items-center justify-between gap-3 px-5 py-3',
        className,
      )}
    >
      {backTo || onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          onClick={() => (onBack ? onBack() : navigate(backTo!))}
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Button>
      ) : (
        <span className="size-11" aria-hidden="true" />
      )}
      <h1
        className={cn(
          'font-display text-[22px] font-semibold leading-7 text-foreground',
          titleClassName,
        )}
      >
        {title}
      </h1>
      <span className="flex min-w-11 justify-end">{action}</span>
    </header>
  )
}
