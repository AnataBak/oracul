"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { BookOpen, ExternalLink, Heart, RefreshCw, Share2 } from "lucide-react"
import { getOracleVoiceOption, type OracleVoice } from "@/lib/oracle-voices"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  artworkId: string
  artworkSignature?: string
  dateDisplay: string | null
  placeOfOrigin: string | null
  artistDisplay: string | null
  styleTitle: string | null
  classificationTitle: string | null
  subjectTitles: string[]
  mediumDisplay: string | null
  dimensions: string | null
  creditLine: string | null
  shortDescription: string | null
  description: string | null
  artworkUrl: string
}

interface ResultStateProps {
  painting: Painting
  comment: string
  voice: OracleVoice
  isRefreshing?: boolean
  museumInfo: MuseumInfo
  onReset: () => void
  onRefreshSameMood: () => void
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

function ListSection({
  title,
  values,
}: {
  title: string
  values: string[]
}) {
  if (values.length === 0) {
    return null
  }

  return <InfoSection title={title} value={values.join(", ")} />
}

export function ResultState({
  painting,
  comment,
  voice,
  isRefreshing = false,
  museumInfo,
  onReset,
  onRefreshSameMood,
}: ResultStateProps) {
  const voiceOption = getOracleVoiceOption(voice)
  const [displayedText, setDisplayedText] = useState("")
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [hasImageError, setHasImageError] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState(painting.imageUrl)
  const [displayMuseumInfo, setDisplayMuseumInfo] = useState(museumInfo)
  const [translatedMuseumInfo, setTranslatedMuseumInfo] = useState<MuseumInfo | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isShowingTranslation, setIsShowingTranslation] = useState(false)

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
    setIsLiked(false)
  }, [painting.imageUrl])

  useEffect(() => {
    setDisplayMuseumInfo(museumInfo)
    setTranslatedMuseumInfo(null)
    setIsShowingTranslation(false)
    setIsTranslating(false)
  }, [museumInfo])

  const handleTranslateToggle = async () => {
    if (isShowingTranslation) {
      setDisplayMuseumInfo(museumInfo)
      setIsShowingTranslation(false)
      return
    }

    if (translatedMuseumInfo) {
      setDisplayMuseumInfo(translatedMuseumInfo)
      setIsShowingTranslation(true)
      return
    }

    try {
      setIsTranslating(true)

      const response = await fetch("/api/translate-museum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ museumInfo }),
      })

      const data = (await response.json()) as {
        museumInfo?: MuseumInfo
        error?: string
      }

      if (!response.ok || !data.museumInfo) {
        throw new Error(data.error || "Не удалось перевести текст")
      }

      setTranslatedMuseumInfo(data.museumInfo)
      setDisplayMuseumInfo(data.museumInfo)
      setIsShowingTranslation(true)
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Не удалось перевести текст. Попробуй еще раз.",
      )
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col">
          <div className="relative overflow-hidden rounded-xl bg-card shadow-xl">
            <div className="pointer-events-none absolute inset-0 z-10 rounded-xl border-8 border-accent/20" />

            <div className="relative min-h-[320px] bg-muted/30">
              {!hasImageError ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="block w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      aria-label="Открыть картину в большом размере"
                    >
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
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[96vh] w-[calc(100vw-1rem)] max-w-7xl overflow-hidden border-border bg-background/95 p-3 backdrop-blur sm:p-4">
                    <DialogTitle className="sr-only">{painting.title}</DialogTitle>
                    <DialogDescription className="sr-only">
                      Увеличенное изображение картины
                    </DialogDescription>
                    <div className="flex max-h-[calc(96vh-2rem)] flex-col gap-3">
                      <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-black/5">
                        <Image
                          src={currentImageUrl}
                          alt={`${painting.title} - ${painting.artist}`}
                          width={1600}
                          height={1200}
                          className="mx-auto h-auto max-h-[82vh] w-auto max-w-full object-contain"
                        />
                      </div>
                      <div className="px-1 pb-1">
                        <p className="font-serif text-base leading-snug text-foreground md:text-lg">
                          {painting.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {painting.year ? `${painting.artist}, ${painting.year}` : painting.artist}
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        Информация о работе из {displayMuseumInfo.source}
                      </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 px-4 pb-6">
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/70 p-4">
                        <p className="text-sm text-muted-foreground">
                          {isShowingTranslation ? "Показан перевод на русский" : "Показан оригинальный текст"}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleTranslateToggle}
                          disabled={isTranslating}
                        >
                          {isTranslating
                            ? "Переводим..."
                            : isShowingTranslation
                              ? "Показать оригинал"
                              : "Перевести"}
                        </Button>
                      </div>

                      <div className="rounded-2xl border border-border bg-background/70 p-4">
                        <p className="font-medium text-foreground">{painting.artist}</p>
                        {painting.year ? (
                          <p className="mt-1 text-sm text-muted-foreground">{painting.year}</p>
                        ) : null}
                      </div>

                      <InfoSection title="Краткое описание" value={displayMuseumInfo.shortDescription} />
                      <InfoSection title="Описание" value={displayMuseumInfo.description} />
                      <InfoSection title="О художнике" value={displayMuseumInfo.artistDisplay} />
                      <InfoSection title="Дата" value={displayMuseumInfo.dateDisplay} />
                      <InfoSection title="Место происхождения" value={displayMuseumInfo.placeOfOrigin} />
                      <InfoSection title="Стиль" value={displayMuseumInfo.styleTitle} />
                      <InfoSection title="Тип работы" value={displayMuseumInfo.classificationTitle} />
                      <ListSection title="Темы" values={displayMuseumInfo.subjectTitles} />
                      <InfoSection title="Материалы" value={displayMuseumInfo.mediumDisplay} />
                      <InfoSection title="Размеры" value={displayMuseumInfo.dimensions} />
                      <InfoSection title="Как попала в коллекцию" value={displayMuseumInfo.creditLine} />

                      <a
                        href={displayMuseumInfo.artworkUrl}
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm uppercase tracking-wider text-muted-foreground">
                Послание оракула
              </p>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span aria-hidden="true">{voiceOption.icon}</span>
                {voiceOption.label}
              </span>
            </div>
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground md:text-lg">
              {displayedText}
              {displayedText.length < comment.length ? (
                <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-primary" />
              ) : null}
            </p>
          </div>

        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 opacity-100 transition-all duration-500 delay-1000 sm:flex-row md:mt-14">
        <Button
          onClick={onRefreshSameMood}
          disabled={isRefreshing}
          variant="outline"
          size="lg"
          className="gap-2 rounded-full border-primary/30 px-8 transition-all duration-300 hover:border-primary hover:bg-primary/10"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Ищу другую..." : "Другая в том же настроении"}
        </Button>

        <Button
          onClick={onReset}
          variant="ghost"
          size="lg"
          className="gap-2 rounded-full px-8 text-muted-foreground transition-all duration-300 hover:text-foreground"
        >
          Попробовать с другим настроением
        </Button>
      </div>
    </div>
  )
}
