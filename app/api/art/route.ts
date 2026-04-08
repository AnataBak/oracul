import { NextResponse } from "next/server"

export const runtime = "nodejs"

const GEMINI_MODEL = "gemini-2.5-flash-lite"
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODEL = "openrouter/free"
const SEARCH_PAGE_SIZE = 24
const SEARCH_OFFSETS = [0, 24, 48, 72, 96]
const RECENT_ARTWORK_LIMIT = 24
const recentArtworkIds: number[] = []

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type Artwork = {
  id: number
  title: string
  artist_title: string | null
  artist_display: string | null
  image_id: string | null
  date_display: string | null
  place_of_origin: string | null
  style_title: string | null
  classification_title: string | null
  subject_titles: string[] | null
  medium_display: string | null
  dimensions: string | null
  credit_line: string | null
  main_reference_number: string | null
  exhibition_history: string | null
  short_description: string | null
  description: string | null
  publication_history: string | null
  provenance_text: string | null
  thumbnail?: {
    lqip?: string | null
  } | null
}

type ArtInstituteResponse = {
  data?: Artwork[]
  pagination?: {
    total?: number
  }
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error"
}

function extractEnglishKeywords(rawKeywords: string): string[] {
  const matches = rawKeywords.toLowerCase().match(/[a-z]+(?:-[a-z]+)?/g) ?? []
  const uniqueKeywords = Array.from(new Set(matches.map((item) => item.trim()).filter(Boolean)))

  return uniqueKeywords.slice(0, 3)
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text()
  return text || `Request failed with status ${response.status}`
}

function stripHtml(value: string | null): string | null {
  if (!value) {
    return null
  }

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[randomIndex]] = [next[randomIndex] as T, next[index] as T]
  }

  return next
}

function rememberArtworkId(artworkId: number) {
  recentArtworkIds.unshift(artworkId)

  if (recentArtworkIds.length > RECENT_ARTWORK_LIMIT) {
    recentArtworkIds.length = RECENT_ARTWORK_LIMIT
  }
}

async function requestOpenRouterText(prompt: string): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://our-art-app.vercel.app",
      "X-OpenRouter-Title": "Art Oracle",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${await readErrorBody(response)}`)
  }

  const data = (await response.json()) as OpenRouterResponse
  const content = data.choices?.[0]?.message?.content?.trim()

  if (!content) {
    throw new Error("OpenRouter returned an empty response")
  }

  return content
}

async function buildKeywordCandidates(userText: string): Promise<string[]> {
  const rawKeywords = await requestOpenRouterText(
    `Прочитай этот текст: "${userText}". Верни 3 разных английских существительных или коротких образа, связанных с настроением пользователя, по которым можно искать классическую картину. Примеры: storm, silence, longing, moon, memory, river. Ответь только тремя словами или короткими фразами на английском через запятую без пояснений.`,
  )

  const primaryKeywords = extractEnglishKeywords(rawKeywords)
  const fallbackKeywords = ["abstract", "dream", "memory", "light", "portrait", "nature"]

  return Array.from(new Set([...primaryKeywords, ...fallbackKeywords]))
}

async function fetchArtwork(searchKeywords: string[]): Promise<Artwork> {
  const fields = [
    "id",
    "title",
    "artist_title",
    "artist_display",
    "image_id",
    "date_display",
    "place_of_origin",
    "style_title",
    "classification_title",
    "subject_titles",
    "medium_display",
    "dimensions",
    "credit_line",
    "main_reference_number",
    "exhibition_history",
    "short_description",
    "description",
    "publication_history",
    "provenance_text",
    "thumbnail",
  ].join(",")

  const requestArtworkBatch = async (keyword: string, offset: number): Promise<Artwork[]> => {
    const artUrl =
      `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(keyword)}` +
      `&fields=${fields}&limit=${SEARCH_PAGE_SIZE}&from=${offset}`

    const artResponse = await fetch(artUrl, {
      cache: "no-store",
    })

    if (!artResponse.ok) {
      throw new Error(`Art Institute request failed: ${await readErrorBody(artResponse)}`)
    }

    const artData = (await artResponse.json()) as ArtInstituteResponse
    const total = artData.pagination?.total ?? 0

    if (total > SEARCH_PAGE_SIZE) {
      const maxOffset = Math.max(0, total - SEARCH_PAGE_SIZE)
      const boundedOffset = Math.min(offset, maxOffset)

      if (boundedOffset !== offset) {
        return requestArtworkBatch(keyword, boundedOffset)
      }
    }

    return Array.isArray(artData.data) ? artData.data : []
  }

  const collectCandidates = async (keyword: string): Promise<Artwork[]> => {
    const offsets = shuffleArray(SEARCH_OFFSETS)
    const batches = await Promise.all(offsets.map((offset) => requestArtworkBatch(keyword, offset)))
    const uniqueArtworks = new Map<number, Artwork>()

    for (const artwork of batches.flat()) {
      if (!artwork.image_id || recentArtworkIds.includes(artwork.id)) {
        continue
      }

      uniqueArtworks.set(artwork.id, artwork)
    }

    return Array.from(uniqueArtworks.values())
  }

  for (const keyword of shuffleArray(searchKeywords)) {
    const candidates = await collectCandidates(keyword)
    const selectedArtwork = shuffleArray(candidates)[0]

    if (selectedArtwork) {
      rememberArtworkId(selectedArtwork.id)
      return selectedArtwork
    }
  }

  for (const keyword of shuffleArray(["abstract", "dream", "memory", "light", "portrait"])) {
    const candidates = await collectCandidates(keyword)
    const selectedArtwork = shuffleArray(candidates)[0]

    if (selectedArtwork) {
      rememberArtworkId(selectedArtwork.id)
      return selectedArtwork
    }
  }

  throw new Error("No artwork with image was found in the Art Institute API")
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set")
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set")
    }

    const body = (await request.json()) as {
      userText?: unknown
      text?: unknown
      emotion?: unknown
    }

    const userText =
      typeof body.userText === "string"
        ? body.userText
        : typeof body.text === "string"
          ? body.text
          : typeof body.emotion === "string"
            ? body.emotion
            : ""

    if (!userText.trim()) {
      return NextResponse.json({ error: "userText is required" }, { status: 400 })
    }

    const searchKeywords = await buildKeywordCandidates(userText)
    const artwork = await fetchArtwork(searchKeywords)

    if (!artwork.image_id) {
      throw new Error("Selected artwork does not contain an image_id")
    }

    const imageUrl = `/api/art-image/${artwork.image_id}`
    const title = artwork.title
    const artist = artwork.artist_title || "Неизвестный автор"
    const artistDisplay = stripHtml(artwork.artist_display) || "Нет дополнительной информации о художнике"
    const shortDescription = stripHtml(artwork.short_description) || "Нет краткого описания"
    const description = stripHtml(artwork.description) || "Нет полного описания"
    const styleTitle = artwork.style_title || "Неуказанный стиль"
    const classificationTitle = artwork.classification_title || "Неуказанный тип работы"
    const subjectTitles =
      Array.isArray(artwork.subject_titles) && artwork.subject_titles.length > 0
        ? artwork.subject_titles.join(", ")
        : "Темы не указаны"

    const geminiPrompt = `Пользователь поделился своими мыслями: "${userText}".
Мы подобрали для него классическую картину: "${title}" (автор: ${artist}).
Дополнительная информация о работе:
- Сведения о художнике: ${artistDisplay}
- Краткое описание: ${shortDescription}
- Полное описание: ${description}
- Стиль: ${styleTitle}
- Тип работы: ${classificationTitle}
- Темы: ${subjectTitles}
Выступи в роли эмпатичного арт-терапевта. Напиши короткий, красивый и утешающий комментарий (3-4 предложения), объясняющий, почему эта картина идеально отражает текущее состояние пользователя. Опирайся на музейное описание и темы работы, а не только на название. Обращайся к пользователю на "ты". Не используй списки в ответе.`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: geminiPrompt }],
          },
        ],
      }),
      cache: "no-store",
    })

    if (!geminiResponse.ok) {
      throw new Error(`Gemini request failed: ${await readErrorBody(geminiResponse)}`)
    }

    const geminiData = (await geminiResponse.json()) as GeminiResponse
    const therapistText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!therapistText) {
      throw new Error("Gemini returned an empty therapistText")
    }

    return NextResponse.json({
      imageUrl,
      fallbackImageUrl: artwork.thumbnail?.lqip || "",
      title,
      artist,
      year: artwork.date_display || "",
      therapistText,
      museumInfo: {
        source: "Art Institute of Chicago API",
        artworkId: artwork.id,
        dateDisplay: artwork.date_display,
        placeOfOrigin: artwork.place_of_origin,
        artistDisplay: stripHtml(artwork.artist_display),
        styleTitle: artwork.style_title,
        classificationTitle: artwork.classification_title,
        subjectTitles: Array.isArray(artwork.subject_titles) ? artwork.subject_titles : [],
        mediumDisplay: artwork.medium_display,
        dimensions: artwork.dimensions,
        creditLine: artwork.credit_line,
        mainReferenceNumber: artwork.main_reference_number,
        exhibitionHistory: stripHtml(artwork.exhibition_history),
        shortDescription: stripHtml(artwork.short_description),
        description: stripHtml(artwork.description),
        publicationHistory: stripHtml(artwork.publication_history),
        provenanceText: stripHtml(artwork.provenance_text),
        artworkUrl: `https://www.artic.edu/artworks/${artwork.id}`,
      },
    })
  } catch (error) {
    console.error("Error in /api/art:", error)

    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 },
    )
  }
}
