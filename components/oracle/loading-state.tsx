"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Frame } from "lucide-react"

const loadingMessages = [
  "Слушаем ваши эмоции...",
  "Идём по залам музеев...",
  "Изучаем коллекции мастеров...",
  "Подбираем нужное полотно...",
  "Снимаем картину со стены...",
]
const RANDOM_LOADING_ART_STORAGE_KEY = "art-oracle-random-loading-artworks"
const RANDOM_LOADING_ART_LIMIT = 80
const ARTWORK_AUTOPLAY_INTERVAL_MS = 5200
const FRAME_DEFAULT_ASPECT = 4 / 5
const FRAME_MAX_HEIGHT = "min(65vh, 560px)"

function getFrameAspect(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return FRAME_DEFAULT_ASPECT
  }

  return width / height
}

type LoadingArtwork = {
  id: string
  signature: string
  imageUrl: string
  fallbackImageUrl?: string
  title: string
  artist: string
  year: string
}

type RecentArtworkMemory = {
  ids: string[]
  signatures: string[]
}

type LoadingStateProps = {
  recentArtworkMemory: RecentArtworkMemory
  excludedArtworkIds?: string[]
  excludedArtworkSignatures?: string[]
}

function normalizeArtworkItems(value: unknown): LoadingArtwork[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Partial<LoadingArtwork> => typeof item === "object" && item !== null)
    .filter(
      (item): item is LoadingArtwork =>
        typeof item.id === "string" &&
        typeof item.signature === "string" &&
        typeof item.imageUrl === "string" &&
        typeof item.title === "string" &&
        typeof item.artist === "string" &&
        typeof item.year === "string",
    )
}

function readRandomLoadingArtworkMemory(): RecentArtworkMemory {
  if (typeof window === "undefined") {
    return { ids: [], signatures: [] }
  }

  try {
    const rawValue = window.localStorage.getItem(RANDOM_LOADING_ART_STORAGE_KEY)

    if (!rawValue) {
      return { ids: [], signatures: [] }
    }

    const parsedValue = JSON.parse(rawValue) as Partial<RecentArtworkMemory>

    return {
      ids: Array.isArray(parsedValue.ids)
        ? parsedValue.ids.filter((item): item is string => typeof item === "string")
        : [],
      signatures: Array.isArray(parsedValue.signatures)
        ? parsedValue.signatures.filter((item): item is string => typeof item === "string")
        : [],
    }
  } catch {
    return { ids: [], signatures: [] }
  }
}

function rememberRandomLoadingArtworks(artworks: LoadingArtwork[]) {
  if (typeof window === "undefined") {
    return
  }

  const currentMemory = readRandomLoadingArtworkMemory()
  const nextMemory: RecentArtworkMemory = {
    ids: Array.from(new Set([...artworks.map((artwork) => artwork.id), ...currentMemory.ids])).slice(
      0,
      RANDOM_LOADING_ART_LIMIT,
    ),
    signatures: Array.from(
      new Set([
        ...artworks.map((artwork) => artwork.signature),
        ...currentMemory.signatures,
      ]),
    ).slice(0, RANDOM_LOADING_ART_LIMIT),
  }

  window.localStorage.setItem(RANDOM_LOADING_ART_STORAGE_KEY, JSON.stringify(nextMemory))
}

export function LoadingState({
  recentArtworkMemory,
  excludedArtworkIds = [],
  excludedArtworkSignatures = [],
}: LoadingStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [artworks, setArtworks] = useState<LoadingArtwork[]>([])
  const [activeArtworkIndex, setActiveArtworkIndex] = useState(0)
  const [autoplayResetKey, setAutoplayResetKey] = useState(0)
  const [frameAspect, setFrameAspect] = useState<number>(FRAME_DEFAULT_ASPECT)
  const touchStartXRef = useRef<number | null>(null)
  const fallbackAttemptedArtworkIdsRef = useRef<Set<string>>(new Set())
  const activeArtwork = artworks[activeArtworkIndex]

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

  useEffect(() => {
    const controller = new AbortController()

    const loadRandomArtworks = async () => {
      try {
        const randomLoadingMemory = readRandomLoadingArtworkMemory()
        const response = await fetch("/api/random-art", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recentArtworkIds: [...recentArtworkMemory.ids, ...randomLoadingMemory.ids],
            recentArtworkSignatures: [...recentArtworkMemory.signatures, ...randomLoadingMemory.signatures],
            excludeArtworkIds: excludedArtworkIds,
            excludeArtworkSignatures: excludedArtworkSignatures,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { artworks?: unknown }
        const nextArtworks = normalizeArtworkItems(data.artworks)

        if (nextArtworks.length > 0) {
          setArtworks(nextArtworks)
          setActiveArtworkIndex(0)
          rememberRandomLoadingArtworks(nextArtworks)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        console.warn("Random loading artworks failed:", error)
      }
    }

    loadRandomArtworks()

    return () => controller.abort()
  }, [
    excludedArtworkIds,
    excludedArtworkSignatures,
    recentArtworkMemory.ids,
    recentArtworkMemory.signatures,
  ])

  useEffect(() => {
    if (artworks.length < 2) {
      return
    }

    const interval = setInterval(() => {
      setActiveArtworkIndex((prev) => (prev + 1) % artworks.length)
    }, ARTWORK_AUTOPLAY_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [artworks.length, autoplayResetKey])

  const resetAutoplay = () => {
    setAutoplayResetKey((prev) => prev + 1)
  }

  const showPreviousArtwork = () => {
    if (artworks.length < 2) {
      return
    }

    setActiveArtworkIndex((prev) => (prev - 1 + artworks.length) % artworks.length)
    resetAutoplay()
  }

  const showNextArtwork = () => {
    if (artworks.length < 2) {
      return
    }

    setActiveArtworkIndex((prev) => (prev + 1) % artworks.length)
    resetAutoplay()
  }

  const handleTouchEnd = (clientX: number) => {
    if (touchStartXRef.current === null) {
      return
    }

    const swipeDistance = clientX - touchStartXRef.current
    touchStartXRef.current = null

    if (Math.abs(swipeDistance) < 40) {
      return
    }

    if (swipeDistance > 0) {
      showPreviousArtwork()
    } else {
      showNextArtwork()
    }
  }

  return (
    <div className="animate-fade-in flex min-h-[440px] flex-col items-center justify-center gap-5">
      <div className="text-center">
        <h2 className="font-serif text-3xl text-foreground md:text-4xl">Загрузка</h2>
        <p className="mt-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Пока Оракул ищет вашу картину, посмотрите случайные работы из галереи
        </p>
        <p
          className={`mt-2 text-sm text-foreground/80 transition-all duration-300 ${
            isVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
          }`}
        >
          {loadingMessages[currentIndex]}
        </p>
      </div>

      <div className="w-full max-w-sm rounded-[2rem] border border-border bg-card/80 p-3 shadow-xl shadow-foreground/5 backdrop-blur-sm">
        {activeArtwork ? (
          <div className="space-y-3">
            <div
              className="relative overflow-hidden rounded-[1.5rem] bg-secondary"
              onTouchStart={(event) => {
                touchStartXRef.current = event.touches[0]?.clientX ?? null
              }}
              onTouchEnd={(event) => {
                handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)
              }}
            >
              <div
                className="relative mx-auto transition-[aspect-ratio,max-height] duration-300 ease-out"
                style={{ aspectRatio: frameAspect, maxHeight: FRAME_MAX_HEIGHT }}
              >
                <Image
                  key={activeArtwork.id}
                  src={activeArtwork.imageUrl}
                  alt={activeArtwork.title}
                  fill
                  unoptimized
                  className="animate-fade-in object-contain"
                  sizes="(max-width: 640px) 88vw, 384px"
                  onLoad={(event) => {
                    const target = event.currentTarget
                    setFrameAspect(getFrameAspect(target.naturalWidth, target.naturalHeight))
                  }}
                  onError={(event) => {
                    if (
                      activeArtwork.fallbackImageUrl &&
                      !fallbackAttemptedArtworkIdsRef.current.has(activeArtwork.id)
                    ) {
                      fallbackAttemptedArtworkIdsRef.current.add(activeArtwork.id)
                      event.currentTarget.src = activeArtwork.fallbackImageUrl
                    }
                  }}
                />
              </div>

              {artworks.length > 1 ? (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
                  <button
                    type="button"
                    className="rounded-full bg-background/80 p-2 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                    aria-label="Предыдущая случайная картина"
                    onClick={showPreviousArtwork}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-background/80 p-2 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                    aria-label="Следующая случайная картина"
                    onClick={showNextArtwork}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="px-1 pb-1 text-left">
              <p className="truncate font-serif text-lg text-foreground">{activeArtwork.title}</p>
              <p className="truncate text-sm text-muted-foreground">
                {[activeArtwork.artist, activeArtwork.year].filter(Boolean).join(", ")}
              </p>
              {artworks.length > 1 ? (
                <div className="mt-3 flex justify-center gap-1.5">
                  {artworks.map((artwork, index) => (
                    <button
                      key={artwork.id}
                      type="button"
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeArtworkIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                      }`}
                      aria-label={`Показать случайную картину ${index + 1}`}
                      onClick={() => {
                        setActiveArtworkIndex(index)
                        resetAutoplay()
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex aspect-[4/5] flex-col items-center justify-center gap-4 rounded-[1.5rem] bg-primary/10 text-primary">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-background/60">
                <Frame className="h-10 w-10" />
              </div>
              <svg className="absolute -inset-4 h-28 w-28 animate-spin" style={{ animationDuration: "3s" }}>
                <circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="96 224"
                  className="text-primary/30"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Достаём случайные работы из музеев...</p>
          </div>
        )}
      </div>
    </div>
  )
}
