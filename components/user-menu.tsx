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

function describeUser(user: User): string {
  if (user.email) {
    return user.email
  }

  if (user.is_anonymous) {
    return "Гость"
  }

  return "Пользователь"
}

export function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>

    try {
      supabase = createSupabaseBrowserClient()
    } catch {
      setIsReady(true)
      return
    }

    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setIsReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

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
        >
          <UserIcon className="h-4 w-4" />
          <span className="hidden sm:inline max-w-[160px] truncate">
            {describeUser(user)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Вы вошли как</p>
          <p className="truncate text-sm font-medium text-foreground">
            {describeUser(user)}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">Личный кабинет</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
