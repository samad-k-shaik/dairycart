/**
 * DeliveryLoginSheet (#109): the admin gives a delivery boy a login, or a new password.
 *
 * He logs in with his mobile number (shown here) and this password, then lands on
 * /delivery. The password is never shown again: the admin tells it to him in person.
 */
import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useSetDeliveryBoyLogin } from "@/hooks/useDeliveryBoys"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { validatePassword } from "@/lib/authValidation"
import { ServiceError } from "@/services/serviceError"
import type { DeliveryBoy } from "@/types/deliveryBoy"

type Props = { boy: DeliveryBoy | null; onClose: () => void }

export function DeliveryLoginSheet({ boy, onClose }: Props) {
  const returnFocus = useReturnFocus()
  return (
    <Sheet open={boy !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" {...returnFocus}>
        {boy && <LoginForm key={boy.delivery_boy_id} boy={boy} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function LoginForm({ boy, onDone }: { boy: DeliveryBoy; onDone: () => void }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({})
  const save = useSetDeliveryBoyLogin()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const passwordError = validatePassword(password)
    const confirmError = confirm !== password ? "The passwords do not match." : null
    if (passwordError || confirmError) {
      setErrors({ password: passwordError ?? undefined, confirm: confirmError ?? undefined })
      return
    }
    save.mutate(
      { id: boy.delivery_boy_id, password },
      {
        onSuccess: () => {
          toast.success(boy.has_login ? `New password set for ${boy.name}` : `${boy.name} can now log in`)
          onDone()
        },
        onError: (error) =>
          setErrors({ form: error instanceof ServiceError ? error.message : "Not saved. Please try again." }),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
      <SheetHeader>
        <SheetTitle className="text-h2 font-bold">{boy.has_login ? "New password" : "Give a login"}</SheetTitle>
        <SheetDescription>
          {boy.name} logs in with his mobile number <span className="font-semibold text-foreground">{boy.phone}</span>{" "}
          and this password, and sees only the orders in his areas. Tell him the password in person.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <PasswordField
          id="delivery-password"
          label="Password"
          hint="At least 8 characters, with a letter and a number."
          value={password}
          error={errors.password}
          onChange={(value) => {
            setPassword(value)
            setErrors((e) => ({ ...e, password: undefined, form: undefined }))
          }}
        />
        <PasswordField
          id="delivery-confirm"
          label="Confirm password"
          value={confirm}
          error={errors.confirm}
          onChange={(value) => {
            setConfirm(value)
            setErrors((e) => ({ ...e, confirm: undefined, form: undefined }))
          }}
        />
        {errors.form && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-small text-danger">
            {errors.form}
          </p>
        )}
      </div>

      <SheetFooter className="mt-auto flex-row justify-end border-t">
        <Button type="button" variant="outline" className="h-11" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" className="h-11" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {boy.has_login ? "Set new password" : "Create login"}
        </Button>
      </SheetFooter>
    </form>
  )
}

function PasswordField(props: {
  id: string
  label: string
  hint?: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const { id, label, hint, value, error, onChange } = props
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete="new-password"
        className="h-11"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-small text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-small text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
