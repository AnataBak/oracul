import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { signOutAction } from "./actions"
import { ProfileForm } from "./profile-form"

export const metadata: Metadata = {
  title: "Личный кабинет — Арт-Оракул",
}

type AccountPageProps = {
  searchParams: Promise<{ welcome?: string }>
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle()

  const displayName = profile?.display_name ?? ""
  const greeting = displayName || user.email || "друг"
  const { welcome } = await searchParams
  const isOnboarding = welcome === "1" && !displayName

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -right-56 -top-48 h-[46rem] w-[46rem] rounded-full bg-primary/5 blur-[160px]" />
        <div className="absolute -left-56 top-10 h-[42rem] w-[42rem] rounded-full bg-accent/5 blur-[160px]" />
      </div>

      <div className="absolute right-5 top-5 z-10 animate-fade-in md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-5 py-14 md:px-10 md:py-20">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Личный кабинет
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {isOnboarding ? "Добро пожаловать!" : `Привет, ${greeting}`}
          </h1>
          {user.email ? (
            <p className="text-sm text-muted-foreground">
              Аккаунт:{" "}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
          ) : null}
        </header>

        <section
          aria-labelledby="profile-heading"
          className="rounded-xl border border-border bg-card/80 p-6 backdrop-blur-sm md:p-8"
        >
          <h2
            id="profile-heading"
            className="text-lg font-semibold text-foreground"
          >
            {isOnboarding ? "Как тебя называть?" : "Профиль"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isOnboarding
              ? "Имя будет видно в шапке вместо email. Можно поменять позже на этой же странице."
              : "Меняйте имя в любой момент — оно отображается в правом верхнем углу сайта."}
          </p>
          <div className="mt-4">
            <ProfileForm
              initialDisplayName={displayName}
              showOnboardingHint={isOnboarding}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/80 p-6 backdrop-blur-sm md:p-8">
          <h2 className="text-lg font-semibold text-foreground">
            Скоро здесь будет
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              — вкладка «Избранное»: лайкнутые расклады с картиной и словами
              оракула;
            </li>
            <li>— вкладка «История»: все ваши прошлые подборы по датам;</li>
            <li>— заметки и теги к каждой карточке;</li>
            <li>— синхронизация между устройствами в реальном времени.</li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Содержимое появится в следующем PR.
          </p>
        </section>

        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="outline">
            <a href="/">К Арт-Оракулу</a>
          </Button>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="text-destructive hover:text-destructive"
            >
              Выйти
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
