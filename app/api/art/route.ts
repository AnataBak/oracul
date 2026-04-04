import { NextResponse } from "next/server"

export const runtime = "nodejs"
const GEMINI_MODEL = "gemini-2.5-flash-lite"

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

  const primaryResults = await requestArtwork(searchKeyword)
  const primaryArtwork = primaryResults.find((item) => item.image_id)

  if (primaryArtwork) {
    return primaryArtwork
  }

  const fallbackResults = await requestArtwork("abstract")
  const fallbackArtwork = fallbackResults.find((item) => item.image_id)

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

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://our-art-app.vercel.app",
        "X-OpenRouter-Title": "Art Oracle",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content: `Прочитай этот текст: "${userText}". Выдели главную эмоцию или объект. Напиши ровно ОДНО английское существительное, по которому можно найти классическую картину (например: storm, sadness, skull, love, chaos, abstract). Верни ТОЛЬКО это одно слово, без точек, кавычек и лишнего текста.`,
          },
        ],
      }),
      cache: "no-store",
    })

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter request failed: ${await readErrorBody(openRouterResponse)}`)
    }

    const openRouterData = (await openRouterResponse.json()) as OpenRouterResponse
    const rawKeyword = openRouterData.choices?.[0]?.message?.content?.trim()

    if (!rawKeyword) {
      throw new Error("OpenRouter returned an empty keyword")
    }

    const searchKeyword = extractEnglishKeyword(rawKeyword)
    const artwork = await fetchArtwork(searchKeyword)

    if (!artwork.image_id) {
      throw new Error("Selected artwork does not contain an image_id")
    }

    const imageUrl = `https://www.artic.edu/iiif/2/${artwork.image_id}/full/843,/0/default.jpg`
    const title = artwork.title
    const artist = artwork.artist_title || "Неизвестный автор"

    const geminiPrompt = `Пользователь поделился своими мыслями: "${userText}". 
Мы подобрали для него классическую картину: "${title}" (автор: ${artist}). 
Выступи в роли эмпатичного арт-терапевта. Напиши короткий, красивый и утешающий комментарий (3-4 предложения), объясняющий, почему эта картина идеально отражает текущее состояние пользователя. Обращайся к пользователю на "ты".`

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
