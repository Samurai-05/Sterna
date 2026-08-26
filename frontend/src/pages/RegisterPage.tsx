import { useState } from 'react'
import { useNavigate } from 'react-router'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthTextInput } from '@/components/auth/AuthTextInput'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { register } from '@/lib/api'
import { saveSession } from '@/lib/session'

type RegisterErrors = {
  confirmPassword?: string
  email?: string
  password?: string
  userName?: string
}

function registerErrors(
  userName: string,
  email: string,
  password: string,
  confirmPassword: string,
): RegisterErrors {
  const errors: RegisterErrors = {}

  if (!userName.trim()) {
    errors.userName = 'Enter your name.'
  }

  if (!email.trim()) {
    errors.email = 'Enter your email address.'
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Enter a password.'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = registerErrors(
      userName,
      email,
      password,
      confirmPassword,
    )
    setErrors(nextErrors)
    setSubmissionMessage('')

    if (Object.keys(nextErrors).length > 0) return

    try {
      setIsSubmitting(true)
      saveSession(await register({ email, password, userName }))
      navigate('/', { replace: true })
    } catch (error) {
      setSubmissionMessage(
        error instanceof Error ? error.message : 'Unable to create account.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start collecting the places that matter to you."
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <AuthTextInput
          id="userName"
          label="Name"
          autoComplete="name"
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
          placeholder="Alex"
          error={errors.userName}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <PasswordInput
          id="confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="sterna-button h-14 w-full rounded-xl disabled:bg-border disabled:text-muted-foreground disabled:opacity-100"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
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
