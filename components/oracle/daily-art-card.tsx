"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ExternalLink, Sparkles } from "lucide-react"

type DailyArt = {
  date: string
  title: string
  artist: string
  year: string
  imageUrl: string
  fallbackImageUrl?: string
  artworkUrl: string
  source: string
}

export function DailyArtCard() {
  const [dailyArt, setDailyArt] = useState<DailyArt | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadDailyArt = async () => {
      try {
        const response = await fetch("/api/daily-art")

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as DailyArt

        if (!isActive) {
          return
        }

        setDailyArt(data)
        setImageUrl(data.imageUrl)
        setIsImageLoaded(false)
      } catch (error) {
        console.warn("Daily artwork failed to load:", error)
      }
    }

    void loadDailyArt()

    return () => {
      isActive = false
    }
  }, [])

  if (!dailyArt) {
    return null
  }

  return (
    <a
      href={dailyArt.artworkUrl}
      target="_blank"
      rel="noreferrer"
      className="group w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card/70 text-left shadow-lg shadow-foreground/5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-primary/10"
    >
      <div className="grid gap-4 p-3 sm:grid-cols-[150px_1fr] sm:p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${dailyArt.title} — ${dailyArt.artist}`}
              fill
              sizes="(max-width: 640px) 100vw, 150px"
              className={`object-cover transition duration-700 group-hover:scale-105 ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => {
                if (dailyArt.fallbackImageUrl && imageUrl !== dailyArt.fallbackImageUrl) {
                  setImageUrl(dailyArt.fallbackImageUrl)
                  setIsImageLoaded(false)
                  return
                }

                setImageUrl("")
              }}
            />
          ) : null}
          {!isImageLoaded && imageUrl ? (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/80 to-muted/30" />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Картина дня
          </div>
          <div>
            <h2 className="line-clamp-2 font-serif text-xl leading-tight text-foreground">
              {dailyArt.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {dailyArt.artist}
              {dailyArt.year ? `, ${dailyArt.year}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{dailyArt.source}</span>
            <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </a>
  )
}
