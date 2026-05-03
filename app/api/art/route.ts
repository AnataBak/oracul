import { NextResponse } from "next/server"
import {
  fetchArtworkFromMuseums,
  getArtworkSignature,
  type MuseumArtwork,
} from "./museum-providers"

export const runtime = "nodejs"

const GEMINI_FAST_MODEL = "gemini-2.5-flash-lite"
const RECENT_ARTWORK_LIMIT = 24
const recentArtworkIds: string[] = []
const recentArtworkSignatures: string[] = []

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

type ArtworkResponseText = {
  therapistText: string
  matchReasons: string[]
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error"
}

function buildGeminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`
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

function rememberArtworkId(artworkId: string) {
  recentArtworkIds.unshift(artworkId)

  if (recentArtworkIds.length > RECENT_ARTWORK_LIMIT) {
    recentArtworkIds.length = RECENT_ARTWORK_LIMIT
  }
}

function rememberArtworkSignature(artwork: MuseumArtwork) {
  recentArtworkSignatures.unshift(getArtworkSignature(artwork))

  if (recentArtworkSignatures.length > RECENT_ARTWORK_LIMIT) {
    recentArtworkSignatures.length = RECENT_ARTWORK_LIMIT
  }
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

function sanitizeSearchKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .flatMap((item) => extractEnglishKeywords(item))
        .filter((item) => item.length >= 3),
    ),
  ).slice(0, 10)
}

async function requestGeminiText(prompt: string, temperature: number): Promise<string> {
  const response = await fetch(buildGeminiUrl(GEMINI_FAST_MODEL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
      },
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${await readErrorBody(response)}`)
  }

  const data = (await response.json()) as GeminiResponse
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!content) {
    throw new Error("Gemini returned an empty response")
  }

  return content
}

function parseArtworkResponseText(rawText: string): ArtworkResponseText {
  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim()

  try {
    const parsedValue = JSON.parse(cleanedText) as Partial<ArtworkResponseText>
    const therapistText =
      typeof parsedValue.therapistText === "string" ? parsedValue.therapistText.trim() : ""
    const matchReasons = Array.isArray(parsedValue.matchReasons)
      ? parsedValue.matchReasons
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3)
      : []

    if (therapistText) {
      return {
        therapistText,
        matchReasons,
      }
    }
  } catch {
    return {
      therapistText: rawText,
      matchReasons: [],
    }
  }

  return {
    therapistText: rawText,
    matchReasons: [],
  }
}

async function buildKeywordCandidates(userText: string): Promise<string[]> {
  const rawKeywords = await requestGeminiText(
    `Прочитай этот текст: "${userText}". Верни 3 разных английских существительных или коротких образа, связанных с настроением пользователя, по которым можно искать музейную работу. Примеры: storm, silence, longing, moon, memory, river. Ответь только тремя словами или короткими фразами на английском через запятую без пояснений.`,
    0.2,
  )

  const primaryKeywords = extractEnglishKeywords(rawKeywords)
  const fallbackKeywords = ["abstract", "dream", "memory", "light", "portrait", "nature"]

  return Array.from(new Set([...primaryKeywords, ...fallbackKeywords]))
}

async function requestGeminiArtworkResponse(
  userText: string,
  artwork: MuseumArtwork,
): Promise<ArtworkResponseText> {
  const museumFacts = [
    `Музей: ${artwork.source}`,
    `Название: ${artwork.title}`,
    `Автор: ${artwork.artist}`,
    `Дата: ${artwork.dateDisplay || artwork.year || "не указана"}`,
    `Место: ${artwork.placeOfOrigin || "не указано"}`,
    `Стиль: ${artwork.styleTitle || "не указан"}`,
    `Тип работы: ${artwork.classificationTitle || "не указан"}`,
    `Темы: ${artwork.subjectTitles.length > 0 ? artwork.subjectTitles.join(", ") : "не указаны"}`,
    `Материалы: ${artwork.mediumDisplay || "не указаны"}`,
    `Краткое описание: ${artwork.shortDescription || "нет"}`,
    `Описание: ${artwork.description || "нет"}`,
    `Ссылка на музей: ${artwork.artworkUrl}`,
  ].join("\n")

  const geminiPrompt = `Пользователь поделился своими мыслями: "${userText}".
Мы подобрали для него работу из музейной коллекции.

${museumFacts}

Выступи в роли эмпатичного арт-терапевта.
Верни строго JSON без markdown, пояснений и лишнего текста:
{
  "therapistText": "короткий, красивый и утешающий комментарий на 3-4 предложения",
  "matchReasons": ["короткая причина 1", "короткая причина 2", "короткая причина 3"]
}

Правила:
- therapistText должен объяснять, почему эта работа может мягко откликнуться состоянию пользователя.
- matchReasons должны быть короткими и понятными: настроение, тема, материал, тип работы, название или описание.
- Строго опирайся только на музейные факты выше: название, автора, дату, тип, материалы, темы и описание.
- Не используй внешние знания об авторе, стиле, эпохе или произведении, если этого нет в музейных фактах выше.
- Не придумывай визуальные детали, эмоции персонажей, сюжет, цвет, место или смысл, если этого нет в фактах.
- Если музейных данных мало, честно и бережно скажи, что работа оставляет пространство для личной ассоциации.
- Обращайся к пользователю на "ты".`

  const rawText = await requestGeminiText(geminiPrompt, 0.7)

  return parseArtworkResponseText(rawText)
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set")
    }

    const body = (await request.json()) as {
      userText?: unknown
      text?: unknown
      emotion?: unknown
      recentArtworkIds?: unknown
      recentArtworkSignatures?: unknown
      searchKeywords?: unknown
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

    const clientRecentArtworkIds = sanitizeRecentValues(body.recentArtworkIds)
    const clientRecentArtworkSignatures = sanitizeRecentValues(body.recentArtworkSignatures)
    const clientSearchKeywords = sanitizeSearchKeywords(body.searchKeywords)
    const searchKeywords =
      clientSearchKeywords.length > 0 ? clientSearchKeywords : await buildKeywordCandidates(userText)
    const artwork = await fetchArtworkFromMuseums(searchKeywords, {
      recentArtworkIds: Array.from(new Set([...clientRecentArtworkIds, ...recentArtworkIds])),
      recentArtworkSignatures: Array.from(
        new Set([...clientRecentArtworkSignatures, ...recentArtworkSignatures]),
      ),
    })
    rememberArtworkId(artwork.id)
    rememberArtworkSignature(artwork)

    const artworkResponse = await requestGeminiArtworkResponse(userText, artwork)

    return NextResponse.json({
      imageUrl: artwork.imageUrl,
      fallbackImageUrl: artwork.fallbackImageUrl || "",
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year,
      therapistText: artworkResponse.therapistText,
      matchReasons: artworkResponse.matchReasons,
      searchKeywords,
      museumInfo: {
        source: artwork.source,
        artworkId: artwork.id,
        artworkSignature: getArtworkSignature(artwork),
        dateDisplay: artwork.dateDisplay,
        placeOfOrigin: artwork.placeOfOrigin,
        artistDisplay: artwork.artistDisplay,
        styleTitle: artwork.styleTitle,
        classificationTitle: artwork.classificationTitle,
        subjectTitles: artwork.subjectTitles,
        mediumDisplay: artwork.mediumDisplay,
        dimensions: artwork.dimensions,
        creditLine: artwork.creditLine,
        shortDescription: artwork.shortDescription,
        description: artwork.description,
        publicationHistory: artwork.publicationHistory,
        artworkUrl: artwork.artworkUrl,
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
