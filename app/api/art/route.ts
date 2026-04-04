import { NextResponse } from "next/server"

export const runtime = "nodejs"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODEL = "openrouter/free"

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
  image_id: string | null
  date_display: string | null
  place_of_origin: string | null
  medium_display: string | null
  dimensions: string | null
  credit_line: string | null
  short_description: string | null
  description: string | null
  publication_history: string | null
  provenance_text: string | null
}

type ArtInstituteResponse = {
  data?: Artwork[]
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error"
}

function extractEnglishKeyword(rawKeyword: string): string {
  const normalized = rawKeyword.trim().toLowerCase()
  const match = normalized.match(/[a-z]+(?:-[a-z]+)?/)

  return match?.[0] ?? "abstract"
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

async function fetchArtwork(searchKeyword: string): Promise<Artwork> {
  const fields = [
    "id",
    "title",
    "artist_title",
    "image_id",
    "date_display",
    "place_of_origin",
    "medium_display",
    "dimensions",
    "credit_line",
    "short_description",
    "description",
    "publication_history",
    "provenance_text",
  ].join(",")

  const requestArtwork = async (keyword: string): Promise<Artwork[]> => {
    const artUrl = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(keyword)}&fields=${fields}`
    const artResponse = await fetch(artUrl, {
      cache: "no-store",
    })

    if (!artResponse.ok) {
      throw new Error(`Art Institute request failed: ${await readErrorBody(artResponse)}`)
    }

    const artData = (await artResponse.json()) as ArtInstituteResponse
    return Array.isArray(artData.data) ? artData.data : []
  }

  const pickRandomArtwork = (artworks: Artwork[]): Artwork | null => {
    const artworksWithImages = artworks.filter((item) => item.image_id)

    if (artworksWithImages.length === 0) {
      return null
    }

    const randomIndex = Math.floor(Math.random() * artworksWithImages.length)
    return artworksWithImages[randomIndex] ?? null
  }

  const primaryResults = await requestArtwork(searchKeyword)
  const primaryArtwork = pickRandomArtwork(primaryResults)

  if (primaryArtwork) {
    return primaryArtwork
  }

  const fallbackResults = await requestArtwork("abstract")
  const fallbackArtwork = pickRandomArtwork(fallbackResults)

  if (!fallbackArtwork) {
    throw new Error("No artwork with image was found in the Art Institute API")
  }

  return fallbackArtwork
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set")
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

    const rawKeyword = await requestOpenRouterText(
      `Прочитай этот текст: "${userText}". Выдели главную эмоцию или объект. Напиши ровно ОДНО английское существительное, по которому можно найти классическую картину. Примеры: storm, sadness, skull, love, chaos, abstract. Верни только одно слово без точки, кавычек и объяснений.`,
    )

    const searchKeyword = extractEnglishKeyword(rawKeyword)
    const artwork = await fetchArtwork(searchKeyword)

    if (!artwork.image_id) {
      throw new Error("Selected artwork does not contain an image_id")
    }

    const imageUrl = `https://www.artic.edu/iiif/2/${artwork.image_id}/full/843,/0/default.jpg`
    const title = artwork.title
    const artist = artwork.artist_title || "Неизвестный автор"

    const therapistText = await requestOpenRouterText(
      `Пользователь поделился своими мыслями: "${userText}".
Мы подобрали для него классическую картину: "${title}" (автор: ${artist}).
Выступи в роли эмпатичного арт-терапевта. Напиши короткий, красивый и утешающий комментарий на русском языке в 3-4 предложениях, объясняющий, почему эта картина отражает текущее состояние пользователя. Обращайся к пользователю на "ты". Не используй списки и служебные пояснения.`,
    )

    return NextResponse.json({
      imageUrl,
      title,
      artist,
      year: artwork.date_display || "",
      therapistText,
      museumInfo: {
        source: "Art Institute of Chicago API",
        artworkId: artwork.id,
        dateDisplay: artwork.date_display,
        placeOfOrigin: artwork.place_of_origin,
        mediumDisplay: artwork.medium_display,
        dimensions: artwork.dimensions,
        creditLine: artwork.credit_line,
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
