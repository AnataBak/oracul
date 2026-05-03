"use client"

import { useEffect, useState } from "react"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputState } from "./oracle/input-state"
import { LoadingState } from "./oracle/loading-state"
import { ResultState } from "./oracle/result-state"

export type OracleStatus = "input" | "loading" | "result"

const RECENT_ARTWORK_STORAGE_KEY = "art-oracle-recent-artworks"
const RECENT_ARTWORK_LIMIT = 100

type ArtOracleResponse = {
  imageUrl: string
  fallbackImageUrl?: string
  title: string
  artist: string
  year?: string
  therapistText: string
  matchReasons?: string[]
  searchKeywords?: string[]
  museumInfo: {
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
    publicationHistory: string | null
    artworkUrl: string
  }
}

type OracleResult = {
  painting: {
    title: string
    artist: string
    year: string
    imageUrl: string
    fallbackImageUrl?: string
  }
  comment: string
  matchReasons: string[]
  searchKeywords: string[]
  museumInfo: ArtOracleResponse["museumInfo"]
}

type RecentArtworkMemory = {
  ids: string[]
  signatures: string[]
}

function readRecentArtworkMemory(): RecentArtworkMemory {
  if (typeof window === "undefined") {
    return { ids: [], signatures: [] }
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_ARTWORK_STORAGE_KEY)

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

function rememberRecentArtwork(artworkId: string, artworkSignature?: string) {
  if (typeof window === "undefined") {
    return
  }

  const currentMemory = readRecentArtworkMemory()
  const nextMemory: RecentArtworkMemory = {
    ids: Array.from(new Set([artworkId, ...currentMemory.ids])).slice(0, RECENT_ARTWORK_LIMIT),
    signatures: Array.from(
      new Set([artworkSignature, ...currentMemory.signatures].filter((item): item is string => Boolean(item))),
    ).slice(0, RECENT_ARTWORK_LIMIT),
  }

  window.localStorage.setItem(RECENT_ARTWORK_STORAGE_KEY, JSON.stringify(nextMemory))
}

export function ArtOracle() {
  const [status, setStatus] = useState<OracleStatus>("input")
  const [userText, setUserText] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [isRefreshingSameMood, setIsRefreshingSameMood] = useState(false)
  const [result, setResult] = useState<OracleResult | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const requestArtwork = async (text: string, searchKeywords?: string[]): Promise<OracleResult> => {
    const recentArtworkMemory = readRecentArtworkMemory()
    const response = await fetch("/api/art", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userText: text,
        recentArtworkIds: recentArtworkMemory.ids,
        recentArtworkSignatures: recentArtworkMemory.signatures,
        searchKeywords,
      }),
    })

    const data = (await response.json()) as Partial<ArtOracleResponse> & {
      error?: string
    }

    if (!response.ok) {
      throw new Error(data.error || "Не удалось получить ответ от сервера")
    }

    if (!data.imageUrl || !data.title || !data.artist || !data.therapistText || !data.museumInfo) {
      throw new Error("Сервер вернул неполный ответ")
    }

    rememberRecentArtwork(data.museumInfo.artworkId, data.museumInfo.artworkSignature)

    return {
      painting: {
        title: data.title,
        artist: data.artist,
        year: data.year || "",
        imageUrl: data.imageUrl,
        fallbackImageUrl: data.fallbackImageUrl || "",
      },
      comment: data.therapistText,
      matchReasons: data.matchReasons || [],
      searchKeywords: data.searchKeywords || searchKeywords || [],
      museumInfo: data.museumInfo,
    }
  }

  const handleSubmit = async () => {
    if (!userText.trim()) return

    setStatus("loading")
    try {
      setResult(await requestArtwork(userText))
      setStatus("result")
    } catch (error) {
      console.error("Art Oracle request failed:", error)
      setStatus("input")
      window.alert(
        error instanceof Error
          ? error.message
          : "Что-то пошло не так. Попробуй еще раз.",
      )
    }
  }

  const handleRefreshSameMood = async () => {
    if (!userText.trim() || isRefreshingSameMood) return

    setIsRefreshingSameMood(true)

    try {
      setResult(await requestArtwork(userText, result?.searchKeywords))
    } catch (error) {
      console.error("Same mood refresh failed:", error)
      window.alert(
        error instanceof Error
          ? error.message
          : "Не удалось подобрать другую картину. Попробуй еще раз.",
      )
    } finally {
      setIsRefreshingSameMood(false)
    }
  }

  const handleReset = () => {
    setStatus("input")
    setUserText("")
    setResult(null)
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-secondary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-50" />
      </div>

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

          {status === "result" && result && (
            <ResultState
              painting={result.painting}
              comment={result.comment}
              matchReasons={result.matchReasons}
              isRefreshing={isRefreshingSameMood}
              museumInfo={result.museumInfo}
              onReset={handleReset}
              onRefreshSameMood={handleRefreshSameMood}
            />
          )}
        </div>
      </div>
    </main>
  )
}
