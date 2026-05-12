"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
} from "@/lib/auth/validation"
import { updateProfileAction, type ProfileFormState } from "./actions"

interface ProfileFormProps {
  initialDisplayName: string
  showOnboardingHint?: boolean
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Сохраняем..." : "Сохранить"}
    </Button>
  )
}

export function ProfileForm({
  initialDisplayName,
  showOnboardingHint,
}: ProfileFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    { error: null, success: false },
  )
  const [value, setValue] = useState(initialDisplayName)

  useEffect(() => {
    if (state.success) {
      router.refresh()
    }
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <div className="space-y-2">
        <Label htmlFor="display_name">Имя для отображения</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="nickname"
          required
          minLength={DISPLAY_NAME_MIN_LENGTH}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          placeholder={
            showOnboardingHint
              ? "например, artemhttp"
              : "буквы, цифры, . _ -"
          }
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby="display_name_hint"
        />
        <p id="display_name_hint" className="text-xs text-muted-foreground">
          От {DISPLAY_NAME_MIN_LENGTH} до {DISPLAY_NAME_MAX_LENGTH} символов.
          Буквы, цифры и символы . _ -
        </p>
      </div>

      {state.error ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-300"
          role="status"
        >
          Имя обновлено.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}
