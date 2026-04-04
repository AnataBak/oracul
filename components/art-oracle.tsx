"use client"

import { useState, useEffect } from "react"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputState } from "./oracle/input-state"
import { LoadingState } from "./oracle/loading-state"
import { ResultState } from "./oracle/result-state"

export type OracleStatus = "input" | "loading" | "result"

// Мок-данные для демонстрации (бэкенд будет подключен позже)
const mockResult = {
  painting: {
    title: "Впечатление. Восходящее солнце",
    artist: "Клод Моне",
    year: "1872",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Monet_-_Impression%2C_Sunrise.jpg/1280px-Monet_-_Impression%2C_Sunrise.jpg",
  },
  therapistComment: `Ваши слова нашли отражение в этом знаменитом полотне Клода Моне — картине, которая дала название целому направлению в искусстве.

Посмотрите, как мягко утренний свет пробивается сквозь туман над гаванью. Всё здесь — в движении и становлении. Контуры размыты, но ощущение жизни, пробуждения и надежды ощущается в каждом мазке.

Может быть, сейчас вы тоже находитесь в такой точке — когда многое ещё не до конца ясно, но свет уже виден. Позвольте себе принять эту красоту неопределённости, как принял её Моне, создав шедевр из тумана и рассвета.`,
}

export function ArtOracle() {
  const [status, setStatus] = useState<OracleStatus>("input")
  const [userText, setUserText] = useState("")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = () => {
    if (!userText.trim()) return
    
    setStatus("loading")
    
    // Имитация API запроса (3-5 секунд)
    setTimeout(() => {
      setStatus("result")
    }, 4000)
  }

  const handleReset = () => {
    setStatus("input")
    setUserText("")
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Декоративный фон */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-secondary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-50" />
      </div>

      {/* Кнопка возврата на главную */}
      {status !== "input" && (
        <div className="absolute top-6 left-6 z-10 animate-fade-in">
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="bg-card/80 backdrop-blur-sm border-border hover:bg-card hover:border-primary/30 transition-all duration-300 gap-2"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">На главную</span>
          </Button>
        </div>
      )}

      {/* Основной контент */}
      <div className="relative flex items-center justify-center min-h-screen px-5 py-16 md:px-10">
        <div 
          className={`w-full max-w-4xl transition-opacity duration-800 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {status === "input" && (
            <InputState
              value={userText}
              onChange={setUserText}
              onSubmit={handleSubmit}
            />
          )}

          {status === "loading" && <LoadingState />}

          {status === "result" && (
            <ResultState
              painting={mockResult.painting}
              comment={mockResult.therapistComment}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </main>
  )
}
