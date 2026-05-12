import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { signInAction } from "./actions"
import { AuthForm } from "./auth-form"

export const metadata: Metadata = {
  title: "Вход — Арт-Оракул",
}

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && !user.is_anonymous) {
    redirect("/account")
  }

  return <AuthForm mode="login" action={signInAction} />
}
