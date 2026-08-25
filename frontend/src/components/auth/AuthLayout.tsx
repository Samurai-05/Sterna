import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const navigate = useNavigate()

  return (
    <main className="min-h-dvh bg-background px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-foreground sm:flex sm:items-center">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-sm flex-col sm:min-h-0">
        <header>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back"
            className="size-11 rounded-full border border-border bg-card text-primary shadow-sm hover:bg-card hover:text-primary"
            onClick={() => navigate('/auth', { replace: true })}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="sterna-screen-title mt-10 font-sans tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {subtitle}
          </p>
        </header>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  )
}
