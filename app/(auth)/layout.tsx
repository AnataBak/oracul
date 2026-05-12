import type { ReactNode } from "react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -right-56 -top-48 h-[46rem] w-[46rem] rounded-full bg-primary/5 blur-[160px]" />
        <div className="absolute -left-56 top-10 h-[42rem] w-[42rem] rounded-full bg-accent/5 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 h-[24rem] w-[46rem] -translate-x-1/2 rounded-full bg-secondary/10 blur-[180px]" />
      </div>

      <div className="absolute right-5 top-5 z-10 animate-fade-in md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <div className="absolute left-5 top-5 z-10 animate-fade-in md:left-6 md:top-6">
        <Link
          href="/"
          className="text-sm uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Арт-Оракул
        </Link>
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-5 py-14 md:px-10 md:py-20">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  )
}
