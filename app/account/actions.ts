"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { validateDisplayName } from "@/lib/auth/validation"

export type ProfileFormState = {
  error: string | null
  success: boolean
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()

  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/")
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim()

  const validationError = validateDisplayName(displayName)
  if (validationError) {
    return { error: validationError, success: false }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Сессия не найдена. Войдите снова.", success: false }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (error) {
    return { error: error.message, success: false }
  }

  revalidatePath("/", "layout")
  revalidatePath("/account")
  return { error: null, success: true }
}
