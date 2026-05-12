import type { NextRequest } from "next/server"
import { updateSupabaseSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSupabaseSession(request)
}

export const config = {
  matcher: [
    /*
     * Пропускаем статику и Next-внутренние ассеты, чтобы не дёргать Supabase
     * на каждый PNG/CSS.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
