"use client"

import { useState } from "react"
import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import {
  PASSWORD_MIN_LENGTH,
  validatePasswordConfirmation,
} from "@/lib/auth/validation"
import type { AuthFormState } from "../auth-form-state"

type AuthAction = (
  state: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>

interface AuthFormProps {
  mode: "login" | "register"
  action: AuthAction
}

const COPY = {
  login: {
    title: "Вход в Арт-Оракул",
    subtitle: "Введите email и пароль, чтобы открыть личный кабинет.",
    submit: "Войти",
    submitting: "Входим...",
    altText: "Ещё нет аккаунта?",
    altLinkLabel: "Зарегистрироваться",
    altHref: "/register",
  },
  register: {
    title: "Регистрация",
    subtitle:
      "Введите email и придумайте пароль. Подтверждение почты не требуется — попадёте сразу в кабинет.",
    submit: "Создать аккаунт",
    submitting: "Создаём...",
    altText: "Уже есть аккаунт?",
    altLinkLabel: "Войти",
    altHref: "/login",
  },
} as const

function SubmitButton({
  idle,
  busy,
  disabled,
}: {
  idle: string
  busy: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size="lg"
      className="w-full"
      disabled={pending || disabled}
    >
      {pending ? busy : idle}
    </Button>
  )
}

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {
    error: null,
  })
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [confirmationTouched, setConfirmationTouched] = useState(false)

  const copy = COPY[mode]
  const isRegister = mode === "register"

  const confirmationError =
    isRegister && confirmationTouched
      ? validatePasswordConfirmation(password, confirmation)
      : null
  const submitDisabled =
    isRegister &&
    (password.length < PASSWORD_MIN_LENGTH ||
      confirmation.length === 0 ||
      password !== confirmation)

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card/80 p-6 backdrop-blur-sm md:p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={PASSWORD_MIN_LENGTH}
            placeholder={`не короче ${PASSWORD_MIN_LENGTH} символов`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {isRegister ? (
          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Повторите пароль</Label>
            <PasswordInput
              id="password_confirmation"
              name="password_confirmation"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              placeholder="введите тот же пароль ещё раз"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              onBlur={() => setConfirmationTouched(true)}
              aria-invalid={confirmationError ? true : undefined}
              aria-describedby={
                confirmationError ? "password_confirmation_error" : undefined
              }
            />
            {confirmationError ? (
              <p
                id="password_confirmation_error"
                role="alert"
                className="text-sm text-destructive"
              >
                {confirmationError}
              </p>
            ) : null}
          </div>
        ) : null}

        {state.error ? (
          <p
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        <SubmitButton
          idle={copy.submit}
          busy={copy.submitting}
          disabled={submitDisabled}
        />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {copy.altText}{" "}
        <Link
          href={copy.altHref}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {copy.altLinkLabel}
        </Link>
      </p>
    </div>
  )
}
