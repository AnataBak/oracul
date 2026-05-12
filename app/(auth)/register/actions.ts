"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { AuthFormState } from "../auth-form-state"

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Введите email и пароль." }
  }

  if (password.length < 6) {
    return { error: "Пароль должен быть не короче 6 символов." }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/account")
}
