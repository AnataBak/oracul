"use client"

import { useEffect, useState } from "react"
import { Frame } from "lucide-react"

const loadingMessages = [
  "Слушаем ваши эмоции...",
  "Идём по залам музеев...",
  "Изучаем коллекции мастеров...",
  "Подбираем нужное полотно...",
  "Снимаем картину со стены...",
]

export function LoadingState() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % loadingMessages.length)
        setIsVisible(true)
      }, 300)
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="animate-fade-in flex min-h-[400px] flex-col items-center justify-center gap-10">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 animate-pulse">
          <Frame className="h-12 w-12 text-primary" />
        </div>

        <svg className="absolute -inset-4 h-32 w-32 animate-spin" style={{ animationDuration: "3s" }}>
          <circle
            cx="64"
            cy="64"
            r="60"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="120 280"
            className="text-primary/30"
          />
        </svg>
      </div>

      <div className="text-center">
        <p
          className={`font-serif text-2xl text-foreground transition-all duration-300 md:text-3xl ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          {loadingMessages[currentIndex]}
        </p>
      </div>
    </div>
  )
}
