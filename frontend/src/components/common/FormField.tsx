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
  /**
   * #121: fixed text shown inside the box before what the user types, e.g. "+91".
   * Only a visual cue (hidden from screen readers): it is NOT part of the value.
   */
  leadingText?: string
  onChange: (value: string) => void
}

export function FormField({ id, label, value, error, hint, leadingText, onChange, ...inputProps }: FormFieldProps) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const input = (
    <Input
      id={id}
      className={leadingText ? "h-11 pl-12" : "h-11"}
      value={value}
      aria-invalid={error ? true : undefined}
      aria-describedby={messageId}
      onChange={(event) => onChange(event.target.value)}
      {...inputProps}
    />
  )
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {leadingText ? (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base text-muted-foreground md:text-sm"
          >
            {leadingText}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
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
