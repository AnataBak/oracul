"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { RefreshCw, Share2, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Painting {
  title: string
  artist: string
  year: string
  imageUrl: string
}

interface ResultStateProps {
  painting: Painting
  comment: string
  onReset: () => void
}

export function ResultState({ painting, comment, onReset }: ResultStateProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  // Эффект печатной машинки для текста
  useEffect(() => {
    if (!isImageLoaded) return
    
    let index = 0
    const interval = setInterval(() => {
      if (index <= comment.length) {
        setDisplayedText(comment.slice(0, index))
        index++
      } else {
        clearInterval(interval)
      }
    }, 15)

    return () => clearInterval(interval)
  }, [comment, isImageLoaded])

  return (
    <div className="animate-fade-in">
      {/* Основной контент: картина и текст */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Блок картины */}
        <div className="flex flex-col">
          {/* Картина в рамке */}
          <div className="relative bg-card rounded-xl overflow-hidden shadow-xl">
            {/* Декоративная рамка */}
            <div className="absolute inset-0 border-8 border-accent/20 rounded-xl pointer-events-none z-10" />
            
            <Image
              src={painting.imageUrl}
              alt={`${painting.title} — ${painting.artist}`}
              width={800}
              height={600}
              className={`w-full h-auto object-cover transition-opacity duration-700 ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setIsImageLoaded(true)}
              priority
            />
          </div>

          {/* Музейная табличка */}
          <div className={`mt-6 p-5 bg-card rounded-xl border border-border transition-all duration-500 delay-300 ${
            isImageLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-xl md:text-2xl text-foreground leading-snug">
                  {painting.title}
                </p>
                <p className="text-muted-foreground mt-1">
                  {painting.year ? `${painting.artist}, ${painting.year}` : painting.artist}
                </p>
              </div>
              
              {/* Кнопки действий */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full transition-colors ${isLiked ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Блок текста от AI */}
        <div className={`space-y-6 transition-all duration-500 delay-500 ${
          isImageLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}>
          <div className="bg-card rounded-xl p-6 md:p-8 border border-border">
            <p className="text-sm text-muted-foreground mb-4 uppercase tracking-wider">
              Послание оракула
            </p>
            <p className="text-foreground text-base md:text-lg leading-relaxed whitespace-pre-line">
              {displayedText}
              {displayedText.length < comment.length && (
                <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-pulse" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Кнопка попробовать снова */}
      <div className={`flex justify-center mt-10 md:mt-14 transition-all duration-500 delay-1000 ${
        isImageLoaded ? "opacity-100" : "opacity-0"
      }`}>
        <Button
          onClick={onReset}
          variant="outline"
          size="lg"
          className="rounded-full px-8 border-primary/30 hover:bg-primary/10 
                     hover:border-primary transition-all duration-300 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Попробовать с другим настроением
        </Button>
      </div>
    </div>
  )
}
