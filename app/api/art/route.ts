import { NextResponse } from "next/server"
import {
  fetchArtworkFromMuseums,
  getArtworkSignature,
  type MuseumArtwork,
} from "./museum-providers"
import { requestGeminiText } from "../gemini"

export const runtime = "nodejs"

const RECENT_ARTWORK_LIMIT = 24
const recentArtworkIds: string[] = []
const recentArtworkSignatures: string[] = []

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

async function buildKeywordCandidates(userText: string): Promise<string[]> {
  const rawKeywords = await requestGeminiText(
    `Прочитай этот текст: "${userText}". Верни 3 разных английских существительных или коротких образа, связанных с настроением пользователя, по которым можно искать музейную работу. Примеры: storm, silence, longing, moon, memory, river. Ответь только тремя словами или короткими фразами на английском через запятую без пояснений.`,
    0.2,
  )

  const primaryKeywords = extractEnglishKeywords(rawKeywords)
  const fallbackKeywords = ["abstract", "dream", "memory", "light", "portrait", "nature"]

  return Array.from(new Set([...primaryKeywords, ...fallbackKeywords]))
}

async function requestGeminiTherapistText(userText: string, artwork: MuseumArtwork): Promise<string> {
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

Выступи в роли эмпатичного арт-терапевта. Напиши короткий, красивый и утешающий комментарий (3-4 предложения), объясняющий, почему эта работа может мягко откликнуться состоянию пользователя.
Строго опирайся только на музейные факты выше: название, автора, дату, тип, материалы, темы и описание. Не придумывай визуальные детали, эмоции персонажей, сюжет, цвет, место или смысл, если этого нет в фактах. Если музейных данных мало, честно и бережно скажи, что работа оставляет пространство для личной ассоциации, вместо того чтобы описывать несуществующие детали. Обращайся к пользователю на "ты". Не используй списки в ответе.`

  return requestGeminiText(geminiPrompt, 0.7)
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
    const searchKeywords = await buildKeywordCandidates(userText)
    const artwork = await fetchArtworkFromMuseums(searchKeywords, {
      recentArtworkIds: Array.from(new Set([...clientRecentArtworkIds, ...recentArtworkIds])),
      recentArtworkSignatures: Array.from(
        new Set([...clientRecentArtworkSignatures, ...recentArtworkSignatures]),
      ),
    })
    rememberArtworkId(artwork.id)
    rememberArtworkSignature(artwork)

    const therapistText = await requestGeminiTherapistText(userText, artwork)

    return NextResponse.json({
      imageUrl: artwork.imageUrl,
      fallbackImageUrl: artwork.fallbackImageUrl || "",
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year,
      therapistText,
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
