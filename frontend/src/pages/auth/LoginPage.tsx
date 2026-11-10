/**
 * Route: `/login` (#89). Username or email + password.
 * After login: back to the page that asked for it (?next=…), otherwise the User
 * Dashboard (/account) for a USER and the Admin Dashboard (/admin) for an ADMIN.
 */
import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { AlertCircle, CheckCircle2, Loader2, LogIn } from "lucide-react"

import { userFacingMessage } from "@/components/common/ErrorState"
import { FormField } from "@/components/common/FormField"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { pathAfterLogin } from "@/lib/authValidation"

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get("next")
  const justRegistered = searchParams.get("registered") === "1"

  const [loginName, setLoginName] = useState(searchParams.get("username") ?? "")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({})
  const [submitError, setSubmitError] = useState<Error | null>(null)
  const [busy, setBusy] = useState(false)

  // Already logged in (e.g. opened /login again): go where a login would go.
  if (user && !busy) return <Navigate to={pathAfterLogin(user.role, next)} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = {
      login: loginName.trim() ? undefined : "Please enter your username or email.",
      password: password ? undefined : "Please enter your password.",
    }
    setErrors(found)
    setSubmitError(null)
    if (found.login || found.password) return

    setBusy(true)
    try {
      const loggedIn = await login({ login: loginName.trim(), password })
      navigate(pathAfterLogin(loggedIn.role, next), { replace: true })
    } catch (error) {
      setSubmitError(error as Error) // 401: "Invalid username/email or password."
      setPassword("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <LogIn className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-h1 font-bold">Log in</h1>
        <p className="text-muted-foreground">Use the username or email you signed up with.</p>
      </div>

      {justRegistered && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-small font-semibold text-green-700">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          Account created. Please log in.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl bg-surface p-5 shadow-card">
        <FormField id="login-name" label="Username or email" autoComplete="username" value={loginName} error={errors.login} onChange={(v) => { setLoginName(v); setErrors((e) => ({ ...e, login: undefined })) }} />
        <FormField id="login-password" label="Password" type="password" autoComplete="current-password" value={password} error={errors.password} onChange={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })) }} />

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
