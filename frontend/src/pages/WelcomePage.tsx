import { Link, useNavigate } from 'react-router'

import backgroundImage from '@/assets/auth-welcome-coast-road-1.jpg'
import { Button } from '@/components/ui/button'
import { saveSession } from '@/lib/session'
import sternaLogo from '../../../landing/src/assets/brand/sterna-logo-white-filled.svg'

export function WelcomePage() {
  const navigate = useNavigate()
  const authSkipEnabled = import.meta.env.VITE_ENABLE_AUTH_SKIP === 'true'

  function handleSkip() {
    saveSession({
      accessToken: 'dev-skip-token',
      user: {
        id: 'dev-user',
        email: 'dev@sterna.app',
        userName: 'Dev Explorer',
        createdAt: new Date().toISOString(),
      },
    })
    navigate('/', { replace: true })
  }

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
          {authSkipEnabled && (
            <Button
              type="button"
              variant="ghost"
              className="sterna-button h-11 w-full text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              onClick={handleSkip}
            >
              Skip
            </Button>
          )}
        </nav>
      </div>
    </main>
  )
}
