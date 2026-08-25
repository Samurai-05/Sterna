import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { authInputClassName } from '@/components/auth/AuthTextInput'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  error?: string
  label: string
}

export function PasswordInput({
  error,
  id,
  label,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          className={cn(authInputClassName, 'pr-12')}
        />
        <button
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex size-12 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-sm leading-5 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
