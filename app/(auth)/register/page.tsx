import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { AuthForm } from "../login/auth-form"
import { signUpAction } from "./actions"

export const metadata: Metadata = {
  title: "Регистрация — Арт-Оракул",
}

export default async function RegisterPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && !user.is_anonymous) {
    redirect("/account")
  }

  return <AuthForm mode="register" action={signUpAction} />
}
