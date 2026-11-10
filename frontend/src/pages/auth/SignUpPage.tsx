/**
 * Route: `/signup` (#89). Full name, email, username, password and confirm password.
 * On success the new USER is sent to the login page to log in with the new account.
 */
import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate } from "react-router"
import { AlertCircle, Loader2, UserPlus } from "lucide-react"

import { userFacingMessage } from "@/components/common/ErrorState"
import { FormField } from "@/components/common/FormField"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { EMPTY_SIGN_UP, toRegisterRequest, validateSignUp, type SignUpErrors, type SignUpValues } from "@/lib/authValidation"
import { register } from "@/services/authService"
import { ServiceError } from "@/services/serviceError"

function SignUpPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState<SignUpValues>(EMPTY_SIGN_UP)
  const [errors, setErrors] = useState<SignUpErrors>({})
  const [submitError, setSubmitError] = useState<Error | null>(null)
  const [saving, setSaving] = useState(false)

  if (user) return <Navigate to="/account" replace />

  function setField(field: keyof SignUpValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validateSignUp(values)
    setErrors(found)
    setSubmitError(null)
    if (Object.keys(found).length > 0) {
      document.getElementById(`signup-${Object.keys(found)[0]}`)?.focus()
      return
    }

    setSaving(true)
    try {
      const created = await register(toRegisterRequest(values))
      navigate(`/login?registered=1&username=${encodeURIComponent(created.username)}`, { replace: true })
    } catch (error) {
      // 409 (taken) and 422 (invalid) name the fields: show each message at its field.
      const details = error instanceof ServiceError ? (error.body.error.details ?? []) : []
      const taken = error instanceof ServiceError && error.status === 409
      const messages: SignUpErrors = taken
        ? {
            email: "This email is already registered. Try logging in.",
            username: "This username is taken. Please choose another.",
          }
        : {
            full_name: "Name must be 2–100 characters.",
            email: "Enter a valid email address.",
            username: "Use 3–30 letters, numbers, dots, dashes or underscores.",
            password: "Use 8+ characters with at least one letter and one number.",
          }
      const fieldErrors: SignUpErrors = {}
      for (const detail of details) {
        const field = detail.field as keyof SignUpErrors
        if (messages[field]) fieldErrors[field] = messages[field]
      }
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
      else setSubmitError(error as Error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <UserPlus className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-h1 font-bold">Create your account</h1>
        <p className="text-muted-foreground">Sign up to see your account details.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl bg-surface p-5 shadow-card">
        <FormField id="signup-full_name" label="Full name" autoComplete="name" value={values.full_name} error={errors.full_name} onChange={(v) => setField("full_name", v)} placeholder="e.g. Ravi Kumar" />
        <FormField id="signup-email" label="Email" type="email" autoComplete="email" value={values.email} error={errors.email} onChange={(v) => setField("email", v)} placeholder="ravi@example.com" />
        <FormField id="signup-username" label="Username" autoComplete="username" value={values.username} error={errors.username} hint="3–30 letters, numbers, dots, dashes or underscores." onChange={(v) => setField("username", v)} />
        <FormField id="signup-password" label="Password" type="password" autoComplete="new-password" value={values.password} error={errors.password} hint="At least 8 characters, with a letter and a number." onChange={(v) => setField("password", v)} />
        <FormField id="signup-confirm_password" label="Confirm password" type="password" autoComplete="new-password" value={values.confirm_password} error={errors.confirm_password} onChange={(v) => setField("confirm_password", v)} />

        {submitError && (
          <p role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-small text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {userFacingMessage(submitError)}
          </p>
        )}

        <Button type="submit" size="lg" className="h-12 w-full" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          Sign up
        </Button>
        <p className="text-center text-small text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}

export default SignUpPage
