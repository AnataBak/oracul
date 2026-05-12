"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { validateEmail, validatePassword } from "@/lib/auth/validation"
import type { AuthFormState } from "../auth-form-state"

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  const emailError = validateEmail(email)
  if (emailError) return { error: emailError }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/account")
}
