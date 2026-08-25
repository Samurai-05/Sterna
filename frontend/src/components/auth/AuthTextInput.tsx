import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const authInputClassName =
  'h-12 w-full rounded-md border border-input bg-card px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20'

type AuthTextInputProps = ComponentProps<'input'> & {
  error?: string
  label: string
}

export function AuthTextInput({
  error,
  id,
  label,
  ...props
}: AuthTextInputProps) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        className={cn(authInputClassName, props.className)}
      />
      {error && (
        <p id={errorId} className="text-sm leading-5 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
