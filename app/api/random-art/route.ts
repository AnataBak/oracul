import { NextResponse } from "next/server"
import {
  MUSEUM_PROVIDERS,
  getArtworkSignature,
  selectRandomDisplayArtworks,
  type MuseumArtwork,
} from "../art/museum-providers"

export const runtime = "nodejs"

const RANDOM_ART_KEYWORDS = [
  "painting",
  "portrait",
  "landscape",
  "interior",
  "still life",
  "garden",
  "sea",
  "city",
  "music",
  "flower",
  "night",
  "summer",
]

type RandomArtItem = {
  id: string
  signature: string
  imageUrl: string
  fallbackImageUrl?: string
  title: string
  artist: string
  year: string
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[randomIndex]] = [next[randomIndex] as T, next[index] as T]
  }

  return next
}

function sanitizeRecentValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 100)
}

function toRandomArtItem(artwork: MuseumArtwork): RandomArtItem {
  return {
    id: artwork.id,
    signature: getArtworkSignature(artwork),
    imageUrl: artwork.imageUrl,
    fallbackImageUrl: artwork.fallbackImageUrl,
    title: artwork.title,
    artist: artwork.artist,
    year: artwork.year || artwork.dateDisplay || "",
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      recentArtworkIds?: unknown
      recentArtworkSignatures?: unknown
      excludeArtworkIds?: unknown
      excludeArtworkSignatures?: unknown
    }
    const recentArtworkIds = Array.from(
      new Set([
        ...sanitizeRecentValues(payload.recentArtworkIds),
        ...sanitizeRecentValues(payload.excludeArtworkIds),
      ]),
    )
    const recentArtworkSignatures = Array.from(
      new Set([
        ...sanitizeRecentValues(payload.recentArtworkSignatures),
        ...sanitizeRecentValues(payload.excludeArtworkSignatures),
      ]),
    )
    const keywords = shuffleArray(RANDOM_ART_KEYWORDS).slice(0, 2)
    const providerResults = await Promise.all(
      keywords.flatMap((keyword) =>
        shuffleArray(MUSEUM_PROVIDERS)
          .slice(0, 3)
          .map(async (provider) => {
            try {
              return await provider.search(keyword, recentArtworkIds)
            } catch (error) {
              console.warn(`${provider.name} random art search failed:`, error)
              return []
            }
          }),
      ),
    )
    const artworks = selectRandomDisplayArtworks(providerResults.flat(), recentArtworkSignatures, 5)

    if (artworks.length === 0) {
      return NextResponse.json({ error: "No random artworks found" }, { status: 404 })
    }

    return NextResponse.json({ artworks: artworks.map(toRandomArtItem) })
  } catch (error) {
    console.error("Random art request failed:", error)
    return NextResponse.json({ error: "Failed to load random artworks" }, { status: 500 })
  }
}
