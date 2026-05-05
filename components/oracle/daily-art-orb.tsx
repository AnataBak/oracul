"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import Image from "next/image"
import { BookOpen, ExternalLink, Palette, Sparkles } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { ErrorNotice } from "./error-notice"

type MuseumInfo = {
  source: string
  artworkId: string
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

type DailyArt = {
  date: string
  title: string
  artist: string
  year: string
  imageUrl: string
  fullImageUrl?: string
  fallbackImageUrl?: string
  artworkUrl: string
  source: string
  museumInfo: MuseumInfo
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

export function DailyArtOrb() {
  const [dailyArt, setDailyArt] = useState<DailyArt | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [dialogImageUrl, setDialogImageUrl] = useState("")
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isDialogImageLoaded, setIsDialogImageLoaded] = useState(false)
  const [displayMuseumInfo, setDisplayMuseumInfo] = useState<MuseumInfo | null>(null)
  const [translatedMuseumInfo, setTranslatedMuseumInfo] = useState<MuseumInfo | null>(null)
  const [isShowingTranslation, setIsShowingTranslation] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)
  const [isFullImageOpen, setIsFullImageOpen] = useState(false)
  const [isFullImageLoaded, setIsFullImageLoaded] = useState(false)
  const [fullImageZoom, setFullImageZoom] = useState(1)
  const fullImageScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const fullImagePanStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)

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
        setDialogImageUrl(data.fullImageUrl || data.imageUrl)
        setDisplayMuseumInfo(data.museumInfo)
        setIsImageLoaded(false)
        setIsDialogImageLoaded(false)
      } catch (error) {
        console.warn("Daily artwork failed to load:", error)
      }
    }

    void loadDailyArt()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!isFullImageOpen) {
      setFullImageZoom(1)
      setIsFullImageLoaded(false)
      fullImagePanStateRef.current = null
    }
  }, [isFullImageOpen])

  useEffect(() => {
    fullImagePanStateRef.current = null
  }, [fullImageZoom])

  const handleTranslateToggle = async () => {
    if (!dailyArt || !displayMuseumInfo) {
      return
    }

    if (isShowingTranslation) {
      setDisplayMuseumInfo(dailyArt.museumInfo)
      setIsShowingTranslation(false)
      setTranslationError(null)
      return
    }

    if (translatedMuseumInfo) {
      setDisplayMuseumInfo(translatedMuseumInfo)
      setIsShowingTranslation(true)
      setTranslationError(null)
      return
    }

    try {
      setIsTranslating(true)
      setTranslationError(null)

      const response = await fetch("/api/translate-museum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ museumInfo: dailyArt.museumInfo }),
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
      setTranslationError(
        error instanceof Error ? error.message : "Не удалось перевести текст. Попробуй ещё раз.",
      )
    } finally {
      setIsTranslating(false)
    }
  }

  const handleFullImagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (fullImageZoom === 1 || event.button !== 0 || event.pointerType !== "mouse") {
      return
    }

    const container = fullImageScrollContainerRef.current

    if (
      !container ||
      (container.scrollWidth <= container.clientWidth && container.scrollHeight <= container.clientHeight)
    ) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    fullImagePanStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
  }

  const handleFullImagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const panState = fullImagePanStateRef.current
    const container = fullImageScrollContainerRef.current

    if (!panState || !container || panState.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    container.scrollLeft = panState.scrollLeft - (event.clientX - panState.startX)
    container.scrollTop = panState.scrollTop - (event.clientY - panState.startY)
  }

  const stopFullImagePan = (event: PointerEvent<HTMLDivElement>) => {
    const panState = fullImagePanStateRef.current

    if (!panState || panState.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    fullImagePanStateRef.current = null
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex cursor-pointer flex-col items-center gap-2.5">
          <div className="rounded-full p-[3px] ring-1 ring-border transition-all duration-300 hover:ring-primary/50">
            <div
              className={cn(
                "group relative h-20 w-20 overflow-hidden rounded-full bg-primary/10 md:h-24 md:w-24",
                "flex items-center justify-center shadow-lg shadow-foreground/5",
                "transition-all duration-300 hover:scale-[1.03]",
              )}
              role="button"
              tabIndex={0}
              aria-label="Открыть картину дня"
            >
              {dailyArt && imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={`Картина дня: ${dailyArt.title}`}
                  fill
                  sizes="96px"
                  className={`object-cover transition duration-700 group-hover:scale-110 ${
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
              ) : (
                <Palette className="h-10 w-10 text-primary md:h-12 md:w-12" />
              )}
            </div>
          </div>
          <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground">
            Картина дня
          </span>
        </div>
      </DialogTrigger>

      {dailyArt && displayMuseumInfo ? (
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border-border p-0 sm:w-[calc(100vw-2rem)]">
          <DialogTitle className="sr-only">Картина дня</DialogTitle>
          <DialogDescription className="sr-only">
            Картина дня с подробностями из музейной карточки.
          </DialogDescription>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <button
              type="button"
              className="relative min-h-[300px] cursor-zoom-in bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background md:min-h-[520px]"
              aria-label="Открыть картину дня в большом размере"
              onClick={() => setIsFullImageOpen(true)}
            >
              {dialogImageUrl ? (
                <Image
                  src={dialogImageUrl}
                  alt={`${dailyArt.title} — ${dailyArt.artist}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className={`object-contain p-3 transition duration-700 ${
                    isDialogImageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setIsDialogImageLoaded(true)}
                  onError={() => {
                    if (dialogImageUrl !== dailyArt.imageUrl) {
                      setDialogImageUrl(dailyArt.imageUrl)
                      setIsDialogImageLoaded(false)
                      return
                    }

                    if (dailyArt.fallbackImageUrl && dialogImageUrl !== dailyArt.fallbackImageUrl) {
                      setDialogImageUrl(dailyArt.fallbackImageUrl)
                      setIsDialogImageLoaded(false)
                    }
                  }}
                />
              ) : null}
              {!isDialogImageLoaded && dialogImageUrl ? (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/80 to-muted/30" />
              ) : null}
            </button>

            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto bg-card p-5 sm:p-6">
              <div className="space-y-2 pr-8">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Картина дня
                </div>
                <h2 className="font-serif text-2xl leading-tight text-foreground sm:text-3xl">
                  {dailyArt.title}
                </h2>
                <p className="text-muted-foreground">
                  {dailyArt.artist}
                  {dailyArt.year ? `, ${dailyArt.year}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button type="button" variant="outline" className="gap-2 rounded-full">
                      <BookOpen className="h-4 w-4" />
                      Подробнее
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full overflow-y-auto border-l border-border bg-card sm:max-w-lg">
                    <SheetHeader className="pr-10">
                      <SheetTitle className="font-serif text-2xl leading-snug">
                        {dailyArt.title}
                      </SheetTitle>
                      <SheetDescription className="text-base">
                        Информация о работе из {displayMuseumInfo.source}
                      </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 px-4 pb-6">
                      {translationError ? (
                        <ErrorNotice
                          title="Перевод не получился"
                          message={translationError}
                          onDismiss={() => setTranslationError(null)}
                        />
                      ) : null}

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
                        <p className="font-medium text-foreground">{dailyArt.artist}</p>
                        {dailyArt.year ? (
                          <p className="mt-1 text-sm text-muted-foreground">{dailyArt.year}</p>
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

                <a
                  href={dailyArt.artworkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Музей
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                Сегодняшняя работа выбирается один раз в день без базы данных — по дате и открытой
                коллекции музея.
              </p>
            </div>
          </div>
        </DialogContent>
      ) : null}

      {dailyArt ? (
        <Dialog open={isFullImageOpen} onOpenChange={setIsFullImageOpen}>
          <DialogContent className="h-[calc(100vh-1rem)] !max-w-[calc(100vw-1rem)] overflow-hidden border-border bg-background/95 p-3 backdrop-blur sm:h-[calc(100vh-2rem)] sm:!max-w-[calc(100vw-2rem)] sm:p-4 xl:!max-w-[1440px]">
            <DialogTitle className="sr-only">Увеличенная картина дня</DialogTitle>
            <DialogDescription className="sr-only">
              Увеличенный просмотр картины дня.
            </DialogDescription>

            <div className="flex h-full min-h-0 flex-col gap-3 pt-8 sm:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/80 px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  {fullImageZoom === 1 ? "Вписано в окно" : `Увеличение ${fullImageZoom}×`}
                </p>
                <div className="flex gap-2">
                  {[1, 1.5, 2, 3].map((zoom) => (
                    <Button
                      key={zoom}
                      type="button"
                      variant={fullImageZoom === zoom ? "default" : "outline"}
                      size="sm"
                      className="h-8 rounded-full px-3"
                      onClick={() => setFullImageZoom(zoom)}
                    >
                      {zoom}×
                    </Button>
                  ))}
                </div>
              </div>

              <div
                ref={fullImageScrollContainerRef}
                className={`min-h-0 flex-1 overflow-auto rounded-xl bg-black/5 p-2 ${
                  fullImageZoom === 1 ? "" : "cursor-grab active:cursor-grabbing"
                }`}
                onPointerDown={handleFullImagePointerDown}
                onPointerMove={handleFullImagePointerMove}
                onPointerUp={stopFullImagePan}
                onPointerCancel={stopFullImagePan}
                onPointerLeave={stopFullImagePan}
              >
                <div
                  className="mx-auto transition-[width] duration-200"
                  style={{ width: fullImageZoom === 1 ? "100%" : `${fullImageZoom * 100}%` }}
                >
                  <Image
                    src={dailyArt.fullImageUrl || dailyArt.imageUrl}
                    alt={`${dailyArt.title} — ${dailyArt.artist}`}
                    width={2400}
                    height={1800}
                    className={`mx-auto h-auto w-full object-contain ${
                      fullImageZoom === 1 ? "max-h-[calc(100vh-12rem)]" : "max-h-none max-w-none"
                    } ${
                      isFullImageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setIsFullImageLoaded(true)}
                    onError={() => {
                      if (dialogImageUrl !== dailyArt.imageUrl) {
                        setDialogImageUrl(dailyArt.imageUrl)
                      }
                    }}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    unoptimized
                    priority
                  />
                  {!isFullImageLoaded ? (
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/80 to-muted/30" />
                  ) : null}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </Dialog>
  )
}
