import { useState } from 'react'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthTextInput } from '@/components/auth/AuthTextInput'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'

type LoginErrors = {
  email?: string
  password?: string
}

function loginErrors(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {}

  if (!email.trim()) {
    errors.email = 'Enter your email address.'
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Enter your password.'
  }

  return errors
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = loginErrors(email, password)
    setErrors(nextErrors)
    setSubmissionMessage('')

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    window.setTimeout(() => {
      setIsSubmitting(false)
      setSubmissionMessage('Authentication will be connected soon.')
    }, 600)
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Return to the places and memories you have collected."
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <AuthTextInput
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          error={errors.email}
        />
        <PasswordInput
          id="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="min-h-11 px-1 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Forgot password?
          </button>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="sterna-button h-14 w-full rounded-xl disabled:bg-border disabled:text-muted-foreground disabled:opacity-100"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
        {submissionMessage && (
          <p
            role="status"
            className="text-center text-sm leading-5 text-muted-foreground"
          >
            {submissionMessage}
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
