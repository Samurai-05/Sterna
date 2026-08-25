import { Link } from 'react-router'

import sternaLogo from '../../../../landing/src/assets/brand/sterna-logo-green-filled.svg'

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <main className="min-h-dvh bg-background px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-foreground sm:flex sm:items-center">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-sm flex-col sm:min-h-0">
        <header>
          <Link
            to="/"
            aria-label="Sterna home"
            className="inline-flex min-h-11 items-center gap-3 rounded-xl text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <img
              src={sternaLogo}
              alt="Sterna logo"
              className="size-10 object-contain"
            />
            <span className="font-display text-[22px] font-semibold leading-7 tracking-tight">
              Sterna
            </span>
          </Link>
          <h1 className="sterna-screen-title mt-10 font-sans tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {subtitle}
          </p>
        </header>

        <div className="mt-8">{children}</div>
        <footer className="mt-auto pt-8 text-center text-sm leading-5 text-muted-foreground">
          {footer}
        </footer>
      </div>
    </main>
  )
}
