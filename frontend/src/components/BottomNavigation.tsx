import { Grid2X2, Map, Plus, UserRound, UsersRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'

import { cn } from '@/lib/utils'
import { createDiscoveryPhotoAction } from '@/lib/photo-capture'

const items = [
  { to: '/', label: 'Map', icon: Map },
  { to: '/collection', label: 'Gallery', icon: Grid2X2 },
  { to: '/groups', label: 'Groups', icon: UsersRound },
  { to: '/profile', label: 'Me', icon: UserRound },
]

export function BottomNavigation({
  onAddDiscovery,
}: {
  onAddDiscovery?: () => void
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      aria-label="Main navigation"
      className="sterna-bottom-navigation fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pt-2 backdrop-blur"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavigationLink
            key={to}
            to={to}
            label={label}
            active={to === '/' ? pathname === '/' : pathname.startsWith(to)}
          >
            <Icon />
          </NavigationLink>
        ))}
        <button
          type="button"
          onClick={() => {
            if (onAddDiscovery) {
              onAddDiscovery()
            } else {
              void createDiscoveryPhotoAction({ navigate })
            }
          }}
          aria-label="Add discovery"
          className="-mt-7 flex min-h-14 flex-col items-center justify-end gap-1 text-xs font-semibold text-primary"
        >
          <span className="flex size-14 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(45,90,61,0.35)]">
            <Plus className="size-6" strokeWidth={2.5} />
          </span>
          Add
        </button>
        {items.slice(2).map(({ to, label, icon: Icon }) => (
          <NavigationLink
            key={to}
            to={to}
            label={label}
            active={pathname.startsWith(to)}
          >
            <Icon />
          </NavigationLink>
        ))}
      </div>
    </nav>
  )
}

function NavigationLink({
  to,
  label,
  active,
  children,
}: {
  to: string
  label: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <span className={cn('size-5', active && 'stroke-[2.5px]')}>
        {children}
      </span>
      {label}
    </Link>
  )
}
