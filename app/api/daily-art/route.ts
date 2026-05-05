import { NextResponse } from "next/server"

export const runtime = "nodejs"

const DAILY_ART_KEYWORDS = [
  "painting",
  "portrait",
  "landscape",
  "interior",
  "still life",
  "garden",
  "sea",
  "night",
  "music",
  "flower",
  "summer",
  "dream",
]

const FIELDS = [
  "id",
  "title",
  "artist_title",
  "image_id",
  "date_display",
  "thumbnail",
].join(",")

type ArtInstituteArtwork = {
  id: number
  title: string | null
  artist_title: string | null
  image_id: string | null
  date_display: string | null
  thumbnail?: {
    lqip?: string | null
  } | null
}

type ArtInstituteResponse = {
  data?: ArtInstituteArtwork[]
  pagination?: {
    total?: number
  }
}

function dailyKey() {
  return new Date().toISOString().slice(0, 10)
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function scoreArtwork(artwork: ArtInstituteArtwork) {
  let score = 0

  if (artwork.image_id) {
    score += 10
  }

  if (artwork.title && !/^(untitled|fragment|study|sketch)$/i.test(artwork.title.trim())) {
    score += 4
  }

  if (artwork.artist_title) {
    score += 3
  }

  if (artwork.date_display) {
    score += 1
  }

  if (artwork.title && /fragment|sample|plate|tile|shard|vessel/i.test(artwork.title)) {
    score -= 8
  }

  return score
}

export async function GET() {
  try {
    const key = dailyKey()
    const seed = hashString(key)
    const keyword = DAILY_ART_KEYWORDS[seed % DAILY_ART_KEYWORDS.length] || "painting"
    const offset = ((Math.floor(seed / DAILY_ART_KEYWORDS.length) % 10) * 24).toString()
    const url =
      `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(keyword)}` +
      `&query[term][is_public_domain]=true&fields=${FIELDS}&limit=24&from=${offset}`

    const response = await fetch(url, {
      next: { revalidate: 60 * 60 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Daily artwork request failed" }, { status: 502 })
    }

    const data = (await response.json()) as ArtInstituteResponse
    const candidates = (data.data || [])
      .filter((artwork) => artwork.image_id)
      .sort((left, right) => scoreArtwork(right) - scoreArtwork(left) || left.id - right.id)

    const artwork = candidates[seed % Math.max(candidates.length, 1)]

    if (!artwork?.image_id) {
      return NextResponse.json({ error: "Daily artwork not found" }, { status: 404 })
    }

    return NextResponse.json({
      date: key,
      title: artwork.title || "Без названия",
      artist: artwork.artist_title || "Неизвестный автор",
      year: artwork.date_display || "",
      imageUrl: `/api/art-image/${artwork.image_id}`,
      fallbackImageUrl: artwork.thumbnail?.lqip || "",
      artworkUrl: `https://www.artic.edu/artworks/${artwork.id}`,
      source: "Art Institute of Chicago",
    })
  } catch (error) {
    console.error("Daily artwork request failed:", error)
    return NextResponse.json({ error: "Failed to load daily artwork" }, { status: 500 })
  }
}
