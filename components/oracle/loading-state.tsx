"use client"

import { useState, useEffect } from "react"
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
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95))
    }, 80)

    return () => clearInterval(progressInterval)
  }, [])

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
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[400px] gap-10">
      {/* Анимированная иконка */}
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
          <Frame className="w-12 h-12 text-primary" />
        </div>
        
        {/* Вращающийся круг */}
        <svg className="absolute -inset-4 w-32 h-32 animate-spin" style={{ animationDuration: '3s' }}>
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

      {/* Текст загрузки */}
      <div className="text-center space-y-4">
        <p 
          className={`font-serif text-2xl md:text-3xl text-foreground
                      transition-all duration-300 ${
                        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                      }`}
        >
          {loadingMessages[currentIndex]}
        </p>
        
        {/* Прогресс-бар */}
        <div className="w-64 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
