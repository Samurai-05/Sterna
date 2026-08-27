import { Link } from 'react-router'

import backgroundImage from '@/assets/auth-welcome-coast-road-1.jpg'
import { Button } from '@/components/ui/button'
import sternaLogo from '../../../landing/src/assets/brand/sterna-logo-white-filled.svg'

export function WelcomePage() {
  return (
    <main className="sterna-auth-welcome relative isolate flex min-h-dvh overflow-hidden bg-primary text-primary-foreground">
      <img
        src={backgroundImage}
        alt="Aerial coastline with a coastal road"
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-black/10 to-black/60"
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <header className="flex items-center gap-3">
          <img
            src={sternaLogo}
            alt="Sterna logo"
            className="size-10 object-contain"
          />
          <span className="font-display text-[22px] font-semibold leading-7 tracking-tight text-white">
            Sterna
          </span>
        </header>

        <section className="mt-auto pt-12">
          <h1 className="sterna-editorial-display max-w-sm tracking-tight">
            Keep your discoveries close
          </h1>
          <p className="mt-3 max-w-sm text-base leading-6 text-primary-foreground/90">
            A personal map for the places, moments and paths that stay with you.
          </p>
        </section>

        <nav aria-label="Authentication" className="mt-8 grid gap-3">
          <Button asChild className="sterna-button h-14 w-full rounded-xl">
            <Link to="/register">Create an account</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="sterna-button h-14 w-full rounded-xl border-primary/20 !bg-white text-primary hover:!bg-white hover:text-primary"
          >
            <Link to="/login">Log in</Link>
          </Button>
        </nav>
      </div>
    </main>
  )
}
