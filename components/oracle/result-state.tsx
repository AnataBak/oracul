"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { BookOpen, ExternalLink, Heart, RefreshCw, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface Painting {
  title: string
  artist: string
  year: string
  imageUrl: string
  fallbackImageUrl?: string
}

interface MuseumInfo {
  source: string
  artworkId: number
  dateDisplay: string | null
  placeOfOrigin: string | null
  mediumDisplay: string | null
  dimensions: string | null
  creditLine: string | null
  shortDescription: string | null
  description: string | null
  publicationHistory: string | null
  provenanceText: string | null
  artworkUrl: string
}

interface ResultStateProps {
  painting: Painting
  comment: string
  museumInfo: MuseumInfo
  onReset: () => void
}

function InfoSection({
  title,
  value,
}: {
  title: string
  value: string | null
}) {
  if (!value) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  )
}

export function ResultState({ painting, comment, museumInfo, onReset }: ResultStateProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [hasImageError, setHasImageError] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState(painting.imageUrl)

  useEffect(() => {
    setDisplayedText("")

    let index = 0
    const interval = setInterval(() => {
      if (index <= comment.length) {
        setDisplayedText(comment.slice(0, index))
        index += 1
      } else {
        clearInterval(interval)
      }
    }, 15)

    return () => clearInterval(interval)
  }, [comment])

  useEffect(() => {
    setCurrentImageUrl(painting.imageUrl)
    setIsImageLoaded(false)
    setHasImageError(false)
  }, [painting.imageUrl])

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col">
          <div className="relative overflow-hidden rounded-xl bg-card shadow-xl">
            <div className="pointer-events-none absolute inset-0 z-10 rounded-xl border-8 border-accent/20" />

            <div className="relative min-h-[320px] bg-muted/30">
              {!hasImageError ? (
                <Image
                  src={currentImageUrl}
                  alt={`${painting.title} - ${painting.artist}`}
                  width={800}
                  height={600}
                  className={`h-auto w-full object-cover transition-opacity duration-700 ${
                    isImageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setIsImageLoaded(true)}
                  onError={() => {
                    if (painting.fallbackImageUrl && currentImageUrl !== painting.fallbackImageUrl) {
                      setCurrentImageUrl(painting.fallbackImageUrl)
                      setIsImageLoaded(false)
                      return
                    }

                    setHasImageError(true)
                    setIsImageLoaded(false)
                  }}
                  priority
                />
              ) : null}

              {!isImageLoaded && !hasImageError ? (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/60 to-muted/20" />
              ) : null}

              {hasImageError ? (
                <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Изображение картины сейчас недоступно, но текст и описание работы сохранены ниже.
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-5 opacity-100 transition-all duration-500 delay-300">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-xl leading-snug text-foreground md:text-2xl">
                  {painting.title}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {painting.year ? `${painting.artist}, ${painting.year}` : painting.artist}
                </p>
              </div>

              <div className="flex gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <BookOpen className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full overflow-y-auto border-l border-border bg-card sm:max-w-lg">
                    <SheetHeader className="pr-10">
                      <SheetTitle className="font-serif text-2xl leading-snug">
                        {painting.title}
                      </SheetTitle>
                      <SheetDescription className="text-base">
                        Информация о работе из {museumInfo.source}
                      </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 px-4 pb-6">
                      <div className="rounded-2xl border border-border bg-background/70 p-4">
                        <p className="font-medium text-foreground">{painting.artist}</p>
                        {painting.year ? (
                          <p className="mt-1 text-sm text-muted-foreground">{painting.year}</p>
                        ) : null}
                      </div>

                      <InfoSection title="Краткое описание" value={museumInfo.shortDescription} />
                      <InfoSection title="Описание" value={museumInfo.description} />
                      <InfoSection title="Дата" value={museumInfo.dateDisplay} />
                      <InfoSection title="Место происхождения" value={museumInfo.placeOfOrigin} />
                      <InfoSection title="Материалы" value={museumInfo.mediumDisplay} />
                      <InfoSection title="Размеры" value={museumInfo.dimensions} />
                      <InfoSection title="Как попала в коллекцию" value={museumInfo.creditLine} />
                      <InfoSection title="История публикаций" value={museumInfo.publicationHistory} />
                      <InfoSection title="Провенанс" value={museumInfo.provenanceText} />

                      <a
                        href={museumInfo.artworkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        Открыть страницу картины в музее
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </SheetContent>
                </Sheet>

                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full transition-colors ${
                    isLiked ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
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

        <div className="space-y-6 opacity-100 transition-all duration-500 delay-500">
          <div className="rounded-xl border border-border bg-card p-6 md:p-8">
            <p className="mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Послание оракула
            </p>
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground md:text-lg">
              {displayedText}
              {displayedText.length < comment.length ? (
                <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-primary" />
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-center opacity-100 transition-all duration-500 delay-1000 md:mt-14">
        <Button
          onClick={onReset}
          variant="outline"
          size="lg"
          className="gap-2 rounded-full border-primary/30 px-8 transition-all duration-300 hover:border-primary hover:bg-primary/10"
        >
          <RefreshCw className="h-4 w-4" />
          Попробовать с другим настроением
        </Button>
      </div>
    </div>
  )
}
