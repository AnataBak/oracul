"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, LogOut, User as UserIcon } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

function describeUser(user: User, displayName: string | null): string {
  if (displayName) return displayName
  if (user.email) return user.email
  if (user.is_anonymous) return "Гость"
  return "Пользователь"
}

export function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>

    try {
      supabase = createSupabaseBrowserClient()
    } catch {
      setIsReady(true)
      return
    }

    const loadProfile = async (current: User | null) => {
      if (!current || current.is_anonymous) {
        setDisplayName(null)
        return
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", current.id)
          .maybeSingle()
        setDisplayName(data?.display_name ?? null)
      } catch {
        // Network/RLS hiccup — keep email fallback rather than block UI.
      }
    }

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        const current = data.user ?? null
        setUser(current)
        setIsReady(true)
        void loadProfile(current)
      })
      .catch(() => {
        setIsReady(true)
      })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const current = session?.user ?? null
        setUser(current)
        setIsReady(true)
        void loadProfile(current)
      },
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (!isReady) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-20 animate-pulse rounded-md bg-card/40"
      />
    )
  }

  if (!user || user.is_anonymous) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="bg-card/80 backdrop-blur-sm border-border hover:bg-card hover:border-primary/30 transition-all duration-300 gap-2"
      >
        <Link href="/login">
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Войти</span>
        </Link>
      </Button>
    )
  }

  const label = describeUser(user, displayName)

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient()

    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-card/80 backdrop-blur-sm border-border hover:bg-card hover:border-primary/30 transition-all duration-300 gap-2"
          data-testid="user-menu-trigger"
        >
          <UserIcon className="h-4 w-4" />
          <span className="hidden sm:inline max-w-[160px] truncate">
            {label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Вы вошли как</p>
          <p className="truncate text-sm font-medium text-foreground">
            {label}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">Личный кабинет</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
