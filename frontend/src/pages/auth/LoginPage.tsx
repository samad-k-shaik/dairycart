/**
 * Route: `/login` (#89). Mobile number + password (#121).
 * After login: back to the page that asked for it (?next=…), otherwise the User
 * Dashboard (/account) for a USER and the Admin Dashboard (/admin) for an ADMIN.
 */
import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { AlertCircle, CheckCircle2, Loader2, LogIn } from "lucide-react"

import { userFacingMessage } from "@/services/serviceError"
import { FormField } from "@/components/common/FormField"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { pathAfterLogin, validateMobile } from "@/lib/authValidation"
import { normaliseMobile } from "@/lib/validation"

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get("next")
  const justRegistered = searchParams.get("registered") === "1"

  // After sign-up the new number is passed in the URL (?phone=…), so it is filled in.
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({})
  const [submitError, setSubmitError] = useState<Error | null>(null)
  const [busy, setBusy] = useState(false)

  // Already logged in (e.g. opened /login again): go where a login would go.
  if (user && !busy) return <Navigate to={pathAfterLogin(user.role, next)} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = {
      phone: validateMobile(phone) ?? undefined,
      password: password ? undefined : "Please enter your password.",
    }
    setErrors(found)
    setSubmitError(null)
    if (found.phone || found.password) return

    setBusy(true)
    try {
      const loggedIn = await login({ phone: normaliseMobile(phone), password })
      navigate(pathAfterLogin(loggedIn.role, next), { replace: true })
    } catch (error) {
      setSubmitError(error as Error) // 401: "Invalid mobile number or password."
      setPassword("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="photo-panel space-y-1 px-4 py-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <LogIn className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-h1 font-bold">Log in</h1>
        <p className="text-muted-foreground">Use the mobile number you signed up with.</p>
      </div>

      {justRegistered && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-small font-semibold text-green-700"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          Account created. Please log in.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl bg-surface p-5 shadow-card">
        <FormField
          id="login-phone"
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          leadingText="+91"
          value={phone}
          error={errors.phone}
          placeholder="98765 43210"
          onChange={(v) => {
            setPhone(v)
            setErrors((e) => ({ ...e, phone: undefined }))
          }}
        />
        <FormField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(v) => {
            setPassword(v)
            setErrors((e) => ({ ...e, password: undefined }))
          }}
        />

        {submitError && (
          <p role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-small text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {userFacingMessage(submitError)}
          </p>
        )}

        <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          Log in
        </Button>
        <p className="text-center text-small text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
