import { NextResponse } from "next/server"
import {
  fetchArtworkFromMuseums,
  getArtworkSignature,
  type MuseumArtwork,
} from "./museum-providers"
import { requestGeminiText } from "../gemini"
import { DEFAULT_ORACLE_VOICE, isOracleVoice, type OracleVoice } from "@/lib/oracle-voices"

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

function normalizeEnglishSearchTerm(value: string): string {
  const matches = value.toLowerCase().match(/[a-z]+(?:-[a-z]+)?/g) ?? []

  return matches.join(" ").trim()
}

function uniqueSearchTerms(values: string[], limit: number): string[] {
  return Array.from(
    new Set(
      values
        .map(normalizeEnglishSearchTerm)
        .filter((item) => item.length >= 3),
    ),
  ).slice(0, limit)
}

function extractEnglishKeywords(rawKeywords: string): string[] {
  return uniqueSearchTerms(rawKeywords.split(/[,;\n]/), 12)
}

function extractJsonArray(value: string, key: string): string[] {
  try {
    const parsedValue = JSON.parse(value.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as {
      [name: string]: unknown
    }
    const rawItems = parsedValue[key]

    if (Array.isArray(rawItems)) {
      return rawItems.filter((item): item is string => typeof item === "string")
    }
  } catch {
    return []
  }

  return []
}

function getIntentExpansionTerms(userText: string): string[] {
  const normalizedText = userText.toLowerCase()
  const terms: string[] = []

  if (/(пицц|ед[ауыо]|вкусн|обед|ужин|завтрак|десерт|есть|ел[аи]?|food|pizza|meal|dinner|lunch|taste|delicious)/i.test(normalizedText)) {
    terms.push("food", "meal", "feast", "table", "still life", "fruit", "bread", "banquet", "abundance")
  }

  if (/(наслажд|удовольств|радост|кайф|довольн|pleasure|enjoy|joy|delight|satisfaction)/i.test(normalizedText)) {
    terms.push("pleasure", "joy", "delight", "celebration", "abundance")
  }

  if (/(спокой|тих|мягк|calm|quiet|peace|soft)/i.test(normalizedText)) {
    terms.push("calm", "serenity", "quiet", "garden", "landscape", "river")
  }

  return terms
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

  return uniqueSearchTerms(
    value.filter((item): item is string => typeof item === "string"),
    12,
  )
}

function getVoicePrompt(voice: OracleVoice): string {
  if (voice === "artHistorian") {
    return `Выступи в роли внимательного искусствоведа. Напиши образовательный комментарий на 5-7 предложений: объясни, что можно понять о работе по музейным фактам, типу, материалам, дате, темам и описанию; аккуратно свяжи это с состоянием пользователя, но не превращай ответ в терапию.
Строго опирайся только на музейные факты выше: название, автора, дату, тип, материалы, темы и описание.
- Не используй внешние знания об авторе, стиле, эпохе или произведении, если этого нет в музейных фактах выше.
- Не придумывай визуальные детали, символику, технику или контекст, если этого нет в фактах.
- Если музейных данных мало, честно скажи, что карточка не даёт достаточно контекста, и объясни только то, что известно.
- Обращайся к пользователю на "ты".
- Не используй списки, markdown, заголовки или JSON.`
  }

  if (voice === "poet") {
    return `Выступи в роли поэта. Напиши короткую свободную стихотворную строфу на 4-6 строк, которая соединяет состояние пользователя и выбранную работу.
Строго опирайся только на музейные факты выше: название, автора, дату, тип, материалы, темы и описание.
- Не придумывай конкретные визуальные детали, персонажей, цвета или сюжет, если этого нет в фактах.
- Не объясняй картину прозой и не делай искусствоведческий разбор.
- Пусть текст будет мягким, образным и понятным, без пафоса.
- Обращайся к пользователю на "ты" только если это естественно.
- Не используй markdown, заголовки или JSON.`
  }

  if (voice === "oracle") {
    return `Выступи в роли таинственного, но бережного оракула. Напиши метафорическое послание на 5-7 предложений: прочитай работу как знак для текущего состояния пользователя, но не делай жёстких предсказаний и не утверждай судьбу.
Строго опирайся только на музейные факты выше: название, автора, дату, тип, материалы, темы и описание.
- Формулируй как приглашение к размышлению: "эта работа словно говорит", "сегодняшний знак может быть о...".
- Не используй внешние знания, мистические факты, биографию автора или символику, если этого нет в музейных фактах.
- Не придумывай визуальные детали, персонажей, цвета, сюжет или место, если этого нет в фактах.
- Обращайся к пользователю на "ты".
- Не используй списки, markdown, заголовки или JSON.`
  }

  return `Выступи в роли эмпатичного арт-терапевта. Напиши красивый, бережный и достаточно развёрнутый комментарий на 5-7 предложений: сначала мягко отрази состояние пользователя, затем свяжи его с выбранной работой, а в конце дай спокойную поддерживающую мысль.
Строго опирайся только на музейные факты выше: название, автора, дату, тип, материалы, темы и описание.
- Не используй внешние знания об авторе, стиле, эпохе или произведении, если этого нет в музейных фактах выше.
- Не придумывай визуальные детали, эмоции персонажей, сюжет, цвет, место или смысл, если этого нет в фактах.
- Если музейных данных мало, честно и бережно скажи, что работа оставляет пространство для личной ассоциации.
- Обращайся к пользователю на "ты".
- Не используй списки, markdown, заголовки или JSON.`
}

async function buildKeywordCandidates(userText: string): Promise<string[]> {
  const rawKeywords = await requestGeminiText(
    `Прочитай этот текст: "${userText}".
Верни строго JSON без markdown и пояснений:
{
  "searchTerms": ["term 1", "term 2", "term 3", "term 4", "term 5", "term 6", "term 7", "term 8"]
}

Правила для searchTerms:
- Только английские музейные поисковые слова или короткие фразы.
- Сначала конкретные видимые мотивы и предметы, потом настроение.
- Если пользователь говорит о еде, вкусе, пицце или застолье, обязательно добавь подходящие музейные слова: food, meal, feast, table, still life, fruit, bread, abundance.
- Если пользователь говорит о наслаждении, радости или удовольствии, добавь pleasure, joy, delight, celebration, abundance.
- Избегай слишком общих слов вроде abstract, dream, memory, light, portrait, если в тексте есть более конкретный образ.
- Не больше 8 терминов.`,
    0.2,
  )

  const structuredKeywords = extractJsonArray(rawKeywords, "searchTerms")
  const primaryKeywords =
    structuredKeywords.length > 0 ? uniqueSearchTerms(structuredKeywords, 8) : extractEnglishKeywords(rawKeywords)
  const expandedKeywords = getIntentExpansionTerms(userText)
  const fallbackKeywords = ["still life", "landscape", "interior", "nature", "portrait"]

  return uniqueSearchTerms([...expandedKeywords, ...primaryKeywords, ...fallbackKeywords], 12)
}

async function requestGeminiArtworkResponse(
  userText: string,
  artwork: MuseumArtwork,
  oracleVoice: OracleVoice,
): Promise<string> {
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

${getVoicePrompt(oracleVoice)}`

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
      searchKeywords?: unknown
      oracleVoice?: unknown
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
    const oracleVoice = isOracleVoice(body.oracleVoice) ? body.oracleVoice : DEFAULT_ORACLE_VOICE
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

    const therapistText = await requestGeminiArtworkResponse(userText, artwork, oracleVoice)

    return NextResponse.json({
      imageUrl: artwork.imageUrl,
      fullImageUrl: artwork.fullImageUrl || artwork.imageUrl,
      fallbackImageUrl: artwork.fallbackImageUrl || "",
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year,
      therapistText,
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
