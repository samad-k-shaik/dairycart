/**
 * FormField: label + input + error message, linked for screen readers (aria-describedby).
 * Used by the sign-up and login forms (#89).
 */
import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FormFieldProps = Omit<ComponentProps<"input">, "onChange" | "value"> & {
  id: string
  label: string
  value: string
  error?: string | null
  hint?: string
  onChange: (value: string) => void
}

export function FormField({ id, label, value, error, hint, onChange, ...inputProps }: FormFieldProps) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="h-11"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="text-small text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-small text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
