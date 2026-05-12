"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? busy : idle}
    </Button>
  )
}

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {
    error: null,
  })
  const copy = COPY[mode]

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card/80 p-6 backdrop-blur-sm md:p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <form action={formAction} className="space-y-4">
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
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            placeholder="не короче 6 символов"
          />
        </div>

        {state.error ? (
          <p
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        <SubmitButton idle={copy.submit} busy={copy.submitting} />
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
