import { NextResponse } from "next/server"
import {
  fetchArtworkCandidatesFromMuseums,
  getArtworkSignature,
  type MuseumArtwork,
} from "./museum-providers"
import { requestGeminiText, type GeminiInlineImage } from "../gemini"
import { sanitizeGeminiTextChain, type GeminiTextModel } from "@/lib/gemini-models"
import {
  EMPTY_ARTWORK_SEARCH_INTENT,
  type ArtworkSearchIntent,
} from "@/lib/artwork-search-intent"
import {
  sanitizeArtworkTypeFilters,
  type ArtworkTypeFilter,
} from "@/lib/artwork-type-filters"
import {
  DEFAULT_ARTWORK_SELECTION_STRICTNESS,
  isArtworkSelectionStrictness,
  type ArtworkSelectionStrictness,
} from "@/lib/artwork-selection-strictness"
import { DEFAULT_ORACLE_VOICE, isOracleVoice, type OracleVoice } from "@/lib/oracle-voices"

export const runtime = "nodejs"

const RECENT_ARTWORK_LIMIT = 24
const MAX_VISUAL_ANALYSIS_IMAGE_BYTES = 2 * 1024 * 1024
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

function mergeTerms(...groups: string[][]): string[] {
  return uniqueSearchTerms(groups.flat(), 12)
}

function extractIntentFromJson(value: string): ArtworkSearchIntent {
  try {
    const parsedValue = JSON.parse(value.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as {
      [name: string]: unknown
    }

    return {
      primaryTerms: uniqueSearchTerms(
        Array.isArray(parsedValue.primarySubjects)
          ? parsedValue.primarySubjects.filter((item): item is string => typeof item === "string")
          : [],
        6,
      ),
      secondaryTerms: uniqueSearchTerms(
        Array.isArray(parsedValue.secondarySubjects)
          ? parsedValue.secondarySubjects.filter((item): item is string => typeof item === "string")
          : [],
        6,
      ),
      sceneTerms: uniqueSearchTerms(
        Array.isArray(parsedValue.sceneTerms)
          ? parsedValue.sceneTerms.filter((item): item is string => typeof item === "string")
          : [],
        6,
      ),
      moodTerms: uniqueSearchTerms(
        Array.isArray(parsedValue.moodTerms)
          ? parsedValue.moodTerms.filter((item): item is string => typeof item === "string")
          : [],
        6,
      ),
      searchTerms: uniqueSearchTerms(
        Array.isArray(parsedValue.searchTerms)
          ? parsedValue.searchTerms.filter((item): item is string => typeof item === "string")
          : [],
        12,
      ),
    }
  } catch {
    return EMPTY_ARTWORK_SEARCH_INTENT
  }
}

function getHeuristicSearchIntent(userText: string): ArtworkSearchIntent {
  const normalizedText = userText.toLowerCase()
  const primaryTerms: string[] = []
  const secondaryTerms: string[] = []
  const sceneTerms: string[] = []
  const moodTerms: string[] = []

  if (/(кот|кошк|котик|коты|cat|cats|kitten|feline)/i.test(normalizedText)) {
    primaryTerms.push("cat", "kitten", "feline")
  }

  if (/(собак|пес|пёс|щен|dog|dogs|puppy|canine)/i.test(normalizedText)) {
    primaryTerms.push("dog", "puppy", "canine")
  }

  if (/(птиц|bird|birds)/i.test(normalizedText)) {
    primaryTerms.push("bird")
  }

  if (/(человек|люди|мужчин|женщин|ребен|ребён|person|people|woman|man|child)/i.test(normalizedText)) {
    primaryTerms.push("figure", "person")
  }

  if (/(дом|дома|комнат|квартир|home|room|indoor|indoors)/i.test(normalizedText)) {
    sceneTerms.push("home", "domestic", "interior")
  }

  if (/(вечер|вечером|ноч|сумерк|закат|evening|night|twilight|dusk)/i.test(normalizedText)) {
    sceneTerms.push("evening", "night", "twilight")
  }

  if (/(утр|рассвет|morning|dawn|sunrise)/i.test(normalizedText)) {
    sceneTerms.push("morning", "dawn")
  }

  if (/(дожд|ливен|rain|storm)/i.test(normalizedText)) {
    sceneTerms.push("rain", "storm")
  }

  if (/(море|океан|река|озер|sea|ocean|river|lake)/i.test(normalizedText)) {
    sceneTerms.push("sea", "ocean", "river", "water")
  }

  if (/(лес|парк|сад|дерев|forest|park|garden|tree)/i.test(normalizedText)) {
    sceneTerms.push("forest", "garden", "tree", "landscape")
  }

  if (/(еда|есть|ем|ужин|обед|завтрак|десерт|пицц|food|meal|dinner|lunch|breakfast|dessert|pizza)/i.test(normalizedText)) {
    primaryTerms.push("food", "meal")
    sceneTerms.push("table", "still life")
  }

  if (/(уют|тёпл|тепл|cozy|cosy|warm)/i.test(normalizedText)) {
    moodTerms.push("cozy", "warmth", "intimacy")
  }

  if (/(тихо|спокой|мягк|calm|quiet|peaceful|peace)/i.test(normalizedText)) {
    moodTerms.push("quiet", "calm", "serenity")
  }

  if (/(груст|печал|скучн|одиноко|меланх|sad|lonely|melancholy|bored)/i.test(normalizedText)) {
    moodTerms.push("melancholy", "solitude", "quiet")
  }

  if (/(радост|счаст|весел|joy|happy|delight)/i.test(normalizedText)) {
    moodTerms.push("joy", "delight", "celebration")
  }

  if (primaryTerms.length === 0 && /(друз|семь|family|friend)/i.test(normalizedText)) {
    secondaryTerms.push("companionship", "gathering")
  }

  return {
    primaryTerms: uniqueSearchTerms(primaryTerms, 6),
    secondaryTerms: uniqueSearchTerms(secondaryTerms, 6),
    sceneTerms: uniqueSearchTerms(sceneTerms, 6),
    moodTerms: uniqueSearchTerms(moodTerms, 6),
    searchTerms: [],
  }
}

function mergeSearchIntent(modelIntent: ArtworkSearchIntent, heuristicIntent: ArtworkSearchIntent): ArtworkSearchIntent {
  const primaryTerms = uniqueSearchTerms(
    [...heuristicIntent.primaryTerms, ...modelIntent.primaryTerms],
    6,
  )
  const secondaryTerms = uniqueSearchTerms(
    [...heuristicIntent.secondaryTerms, ...modelIntent.secondaryTerms],
    6,
  )
  const sceneTerms = uniqueSearchTerms(
    [...heuristicIntent.sceneTerms, ...modelIntent.sceneTerms],
    6,
  )
  const moodTerms = uniqueSearchTerms(
    [...heuristicIntent.moodTerms, ...modelIntent.moodTerms],
    6,
  )

  return {
    primaryTerms,
    secondaryTerms,
    sceneTerms,
    moodTerms,
    searchTerms: mergeTerms(primaryTerms, secondaryTerms, sceneTerms, moodTerms, modelIntent.searchTerms),
  }
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

function isVisualAnalysisEnabled(value: unknown): boolean {
  return value === true
}

function getSelectionStrictness(value: unknown): ArtworkSelectionStrictness {
  return isArtworkSelectionStrictness(value) ? value : DEFAULT_ARTWORK_SELECTION_STRICTNESS
}

function getSoftExpansionTerms(userText: string): string[] {
  const normalizedText = userText.toLowerCase()
  const terms: string[] = []

  if (/(пицц|ед[ауыо]|вкусн|обед|ужин|завтрак|десерт|есть|ел[аи]?|food|pizza|meal|dinner|lunch|taste|delicious|наслажд|удовольств|радост|кайф|довольн|pleasure|enjoy|joy|delight|satisfaction)/i.test(normalizedText)) {
    terms.push("pleasure", "delight", "abundance", "warmth", "celebration", "joy")
  }

  if (/(спокой|тих|мягк|calm|quiet|peace|soft)/i.test(normalizedText)) {
    terms.push("serenity", "soft light", "quiet", "garden", "landscape")
  }

  if (/(груст|печал|меланхол|одинок|sad|melancholy|lonely)/i.test(normalizedText)) {
    terms.push("melancholy", "solitude", "evening", "interior", "quiet")
  }

  return terms
}

function getLiteralExpansionTerms(userText: string): string[] {
  const normalizedText = userText.toLowerCase()
  const terms: string[] = []

  if (/(пицц|ед[ауыо]|вкусн|обед|ужин|завтрак|десерт|есть|ел[аи]?|food|pizza|meal|dinner|lunch|taste|delicious)/i.test(normalizedText)) {
    terms.push("food", "meal", "feast", "table", "banquet", "still life", "bread", "fruit")
  }

  if (/(\bрек[аиеуой]\b|\bвод[ауыоей]\b|\bмор[еяюем]\b|\bокеан[а-я]*\b|river|water|sea|ocean)/i.test(normalizedText)) {
    terms.push("river", "water", "sea", "boat", "landscape")
  }

  if (/(сон|спать|кровать|ноч|sleep|bed|night)/i.test(normalizedText)) {
    terms.push("sleep", "bed", "night", "bedroom", "interior")
  }

  if (/(дом|комнат|уют|home|room|cozy)/i.test(normalizedText)) {
    terms.push("home", "interior", "room", "domestic")
  }

  return terms
}

function applySelectionStrictnessToKeywords(
  userText: string,
  searchKeywords: string[],
  strictness: ArtworkSelectionStrictness,
): string[] {
  if (strictness === "soft") {
    return uniqueSearchTerms([...getSoftExpansionTerms(userText), ...searchKeywords], 12)
  }

  if (strictness === "literal") {
    return uniqueSearchTerms([...getLiteralExpansionTerms(userText), ...searchKeywords], 10)
  }

  if (strictness === "precise") {
    return uniqueSearchTerms(searchKeywords.slice(0, 8), 8)
  }

  return searchKeywords
}

function trimSceneTermsForLiteral(sceneTerms: string[], hasPrimaryTerms: boolean): string[] {
  if (!hasPrimaryTerms) {
    return sceneTerms
  }

  const genericBackgroundTerms = new Set(["home", "domestic", "interior", "room"])

  return sceneTerms.filter((term) => !genericBackgroundTerms.has(term))
}

function applySelectionStrictnessToIntent(
  baseIntent: ArtworkSearchIntent,
  strictness: ArtworkSelectionStrictness,
): ArtworkSearchIntent {
  if (strictness === "soft") {
    return {
      ...baseIntent,
      searchTerms: mergeTerms(
        baseIntent.moodTerms,
        baseIntent.sceneTerms,
        baseIntent.primaryTerms,
        baseIntent.secondaryTerms,
      ).slice(0, 12),
    }
  }

  if (strictness === "literal") {
    return {
      ...baseIntent,
      searchTerms: mergeTerms(
        baseIntent.primaryTerms,
        trimSceneTermsForLiteral(baseIntent.sceneTerms, baseIntent.primaryTerms.length > 0),
        baseIntent.secondaryTerms,
      ).slice(0, 8),
    }
  }

  if (strictness === "precise") {
    return {
      ...baseIntent,
      searchTerms: mergeTerms(
        baseIntent.primaryTerms,
        baseIntent.secondaryTerms,
        baseIntent.sceneTerms,
        baseIntent.moodTerms.slice(0, 2),
      ).slice(0, 8),
    }
  }

  return {
    ...baseIntent,
    searchTerms: mergeTerms(
      baseIntent.primaryTerms,
      baseIntent.sceneTerms,
      baseIntent.moodTerms,
      baseIntent.secondaryTerms,
    ).slice(0, 10),
  }
}

function buildIntentFromKeywords(searchKeywords: string[], userText: string): ArtworkSearchIntent {
  const heuristicIntent = getHeuristicSearchIntent(userText)

  return {
    ...heuristicIntent,
    searchTerms: mergeTerms(
      heuristicIntent.primaryTerms,
      heuristicIntent.sceneTerms,
      heuristicIntent.moodTerms,
      searchKeywords,
    ),
  }
}

function getVisualAnalysisInstructions(): string {
  return `

Дополнительно тебе передано изображение выбранной работы. Используй его вместе с музейными фактами.
- Музейные факты выше остаются главным источником для названия, автора, даты, материала и контекста.
- По изображению можно описывать только то, что уверенно видно: общую композицию, крупные объекты, настроение, свет, цвет, пространство, заметные фигуры или предметы.
- Не придумывай мелкие детали, текст, выражения лиц, сюжет, символику или смысл, если они не видны уверенно и не подтверждаются музейными фактами.
- Если изображение маленькое, размытое или деталь неразборчива, честно опирайся на музейное описание и не делай вид, что видишь больше.`
}

async function fetchArtworkImageForGemini(artwork: MuseumArtwork): Promise<GeminiInlineImage | null> {
  const imageUrl = artwork.imageUrl

  if (!imageUrl) {
    return null
  }

  const requestUrl = imageUrl.startsWith("/")
    ? new URL(imageUrl, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    : new URL(imageUrl)

  try {
    const response = await fetch(requestUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get("Content-Type") || "image/jpeg"

    if (!contentType.startsWith("image/")) {
      return null
    }

    const contentLength = Number(response.headers.get("Content-Length") || "0")

    if (contentLength > MAX_VISUAL_ANALYSIS_IMAGE_BYTES) {
      return null
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer())

    if (imageBuffer.byteLength > MAX_VISUAL_ANALYSIS_IMAGE_BYTES) {
      return null
    }

    return {
      mimeType: contentType.split(";")[0] || "image/jpeg",
      data: imageBuffer.toString("base64"),
    }
  } catch (error) {
    console.warn("Artwork image could not be prepared for Gemini visual analysis.", error)
    return null
  }
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

async function buildKeywordCandidates(
  userText: string,
  modelChain?: readonly string[],
): Promise<string[]> {
  const { text: rawKeywords } = await requestGeminiText(
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
    undefined,
    modelChain,
  )

  const structuredKeywords = extractJsonArray(rawKeywords, "searchTerms")
  const primaryKeywords =
    structuredKeywords.length > 0 ? uniqueSearchTerms(structuredKeywords, 8) : extractEnglishKeywords(rawKeywords)
  const expandedKeywords = getIntentExpansionTerms(userText)
  const fallbackKeywords = ["still life", "landscape", "interior", "nature", "portrait"]

  return uniqueSearchTerms([...expandedKeywords, ...primaryKeywords, ...fallbackKeywords], 12)
}

async function buildSearchIntent(
  userText: string,
  modelChain?: readonly string[],
): Promise<ArtworkSearchIntent> {
  const { text: rawIntent } = await requestGeminiText(
    `Read this text: "${userText}".
Return strict JSON with no markdown:
{
  "primarySubjects": ["term 1", "term 2"],
  "secondarySubjects": ["term 3", "term 4"],
  "sceneTerms": ["term 5", "term 6"],
  "moodTerms": ["term 7", "term 8"],
  "searchTerms": ["term 1", "term 5", "term 7"]
}

Rules:
- Use only English museum-search words or short phrases.
- primarySubjects: the main things the user most wants to see in the image.
- secondarySubjects: important but not central things.
- sceneTerms: time, place, setting, environment.
- moodTerms: atmosphere or emotional tone.
- If there is a concrete animal, person, or object, do not make home, room, interior, or domestic a primary subject.
- Do not add still life, portrait, landscape, or interior unless the user clearly asks for that kind of image.
- Keep the most useful search words only.
- Maximum: 2 primarySubjects, 3 secondarySubjects, 4 sceneTerms, 4 moodTerms, 8 searchTerms.`,
    0.2,
    undefined,
    modelChain,
  )

  const structuredIntent = extractIntentFromJson(rawIntent)
  const heuristicIntent = getHeuristicSearchIntent(userText)
  const mergedIntent = mergeSearchIntent(structuredIntent, heuristicIntent)

  if (mergedIntent.searchTerms.length > 0) {
    return mergedIntent
  }

  const fallbackKeywords = await buildKeywordCandidates(userText, modelChain)

  return {
    ...heuristicIntent,
    searchTerms: mergeTerms(
      heuristicIntent.primaryTerms,
      heuristicIntent.sceneTerms,
      fallbackKeywords,
    ),
  }
}

const ARTWORK_CANDIDATE_LIMIT = 15
const VISUAL_VIBE_CHECK_LIMIT = 3
const RERANK_DESCRIPTION_CHAR_LIMIT = 220

function truncateForRerank(value: string | null | undefined, limit: number): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.length <= limit) {
    return trimmed
  }

  return `${trimmed.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function buildRerankCandidateBlock(artwork: MuseumArtwork, candidateId: number): string {
  const headline = `[${candidateId}] "${artwork.title}" — ${artwork.artist} (${
    artwork.dateDisplay || artwork.year || "дата не указана"
  })`
  const metadata = `Тип: ${artwork.classificationTitle || "не указан"}. Материал: ${
    artwork.mediumDisplay || "не указан"
  }.`
  const subjects =
    artwork.subjectTitles.length > 0
      ? `Темы: ${artwork.subjectTitles.slice(0, 6).join(", ")}.`
      : null
  const shortDescription = truncateForRerank(artwork.shortDescription, RERANK_DESCRIPTION_CHAR_LIMIT)
  const description =
    shortDescription === null
      ? truncateForRerank(artwork.description, RERANK_DESCRIPTION_CHAR_LIMIT)
      : null
  const lines = [headline, metadata, subjects, shortDescription, description].filter(
    (line): line is string => typeof line === "string" && line.length > 0,
  )

  return lines.join("\n")
}

function parseRerankOrder(raw: string, candidatesCount: number): number[] | null {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()

  try {
    const parsed = JSON.parse(cleaned) as { order?: unknown }

    if (!Array.isArray(parsed.order)) {
      return null
    }

    const order: number[] = []
    const seen = new Set<number>()

    for (const entry of parsed.order) {
      const value =
        typeof entry === "number"
          ? entry
          : typeof entry === "string"
            ? Number.parseInt(entry, 10)
            : Number.NaN

      if (!Number.isInteger(value) || value < 1 || value > candidatesCount || seen.has(value)) {
        continue
      }

      seen.add(value)
      order.push(value)
    }

    return order.length > 0 ? order : null
  } catch {
    return null
  }
}

async function rerankCandidatesByVibe(
  userText: string,
  candidates: MuseumArtwork[],
  modelChain?: readonly string[],
): Promise<MuseumArtwork[]> {
  if (candidates.length <= 1) {
    return candidates
  }

  const candidateBlocks = candidates
    .map((artwork, index) => buildRerankCandidateBlock(artwork, index + 1))
    .join("\n\n")
  const prompt = `Пользователь написал: "${userText}".

Ниже список из ${candidates.length} работ из музейных коллекций (только текстовые описания, без изображений). Тебе нужно отсортировать их от лучшей к худшей по тому, насколько каждая передаёт настроение, атмосферу и общий вайб того, что пользователь хотел почувствовать.

Сначала про себя определи, какое настроение и какой вайб у пользователя сейчас, опираясь только на его текст. Это может быть уют, тоска, лёгкость, тревога, мечтательность, торжественность, страх, спокойствие — любая эмоция. Не используй заранее заготовленные правила вроде "всегда избегать мрачного" или "всегда выбирать спокойное" — ориентируйся только на то, что написал сам пользователь.

Затем оцени каждую работу. Важнее всего общее настроение и атмосфера: тональность, свет, эмоциональный окрас, тематика. Конкретные предметы не обязаны буквально совпадать с текстом пользователя — главное вайб. Если несколько работ передают нужный вайб одинаково хорошо, отдай предпочтение более качественной (понятное описание, известный автор, более выразительная композиция).

Кандидаты:

${candidateBlocks}

Верни строго JSON без markdown и пояснений:
{"order": [<id1>, <id2>, ..., <id${candidates.length}>]}

Правила:
- В order должны быть ВСЕ ${candidates.length} ID-кандидата от лучшего (первый) к худшему (последний).
- Используй только указанные ID-числа в квадратных скобках.
- Никаких других полей, никаких пояснений.`

  try {
    const { text } = await requestGeminiText(prompt, 0.3, undefined, modelChain)
    const order = parseRerankOrder(text, candidates.length)

    if (!order) {
      return candidates
    }

    const reordered: MuseumArtwork[] = []
    const seen = new Set<number>()

    for (const candidateId of order) {
      seen.add(candidateId)
      reordered.push(candidates[candidateId - 1])
    }

    for (let index = 0; index < candidates.length; index += 1) {
      if (!seen.has(index + 1)) {
        reordered.push(candidates[index])
      }
    }

    return reordered
  } catch (error) {
    console.warn("Vibe rerank failed, keeping score-based order.", error)
    return candidates
  }
}

function parseVisualVibeDecision(raw: string): boolean | null {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()

  try {
    const parsed = JSON.parse(cleaned) as { match?: unknown }

    if (typeof parsed.match === "boolean") {
      return parsed.match
    }
  } catch {
    /* fall through to permissive parsing */
  }

  const normalized = cleaned.toLowerCase()

  if (/"match"\s*:\s*true/.test(normalized)) {
    return true
  }

  if (/"match"\s*:\s*false/.test(normalized)) {
    return false
  }

  return null
}

async function verifyCandidateMatchesVibe(
  userText: string,
  artwork: MuseumArtwork,
  modelChain?: readonly string[],
): Promise<boolean | null> {
  const image = await fetchArtworkImageForGemini(artwork)

  if (!image) {
    return null
  }

  const prompt = `Пользователь написал: "${userText}".

Посмотри на это изображение работы из музейной коллекции и реши, передаёт ли оно настроение, атмосферу и вайб того, что хотел почувствовать пользователь.

Сначала про себя определи, какое настроение и какой вайб ищет пользователь, опираясь только на его текст. Затем посмотри на изображение целиком: цвет, свет, тональность, общее эмоциональное впечатление.

Не нужно, чтобы предметы на картине буквально совпадали с тем, что описал пользователь — важнее общая атмосфера. Не используй заранее заготовленные правила вроде "всегда избегать мрачного" или "всегда выбирать тёплое" — ориентируйся только на то, что написал сам пользователь.

Верни строго JSON без markdown и пояснений:
{"match": true}
или
{"match": false}

Правила:
- match=true, если работа адекватно передаёт нужный вайб.
- match=false, если по атмосфере и эмоции она явно мимо.
- Никаких других полей, никаких пояснений.`

  try {
    const { text } = await requestGeminiText(prompt, 0.3, image, modelChain)
    return parseVisualVibeDecision(text)
  } catch (error) {
    console.warn("Visual vibe check failed.", error)
    return null
  }
}

async function selectArtworkByVibe(
  userText: string,
  candidates: MuseumArtwork[],
  visualAnalysisEnabled: boolean,
  modelChain?: readonly string[],
): Promise<{
  artwork: MuseumArtwork
  rerankApplied: boolean
  visualCheckPassed: boolean | null
}> {
  if (candidates.length === 0) {
    throw new Error("No artwork with image was found in the museum APIs")
  }

  const rerankedCandidates = await rerankCandidatesByVibe(userText, candidates, modelChain)
  const rerankApplied = rerankedCandidates.length > 1
  const bestTextRerank = rerankedCandidates[0]

  if (!visualAnalysisEnabled || rerankedCandidates.length === 0) {
    return { artwork: bestTextRerank, rerankApplied, visualCheckPassed: null }
  }

  const maxChecks = Math.min(rerankedCandidates.length, VISUAL_VIBE_CHECK_LIMIT)

  for (let index = 0; index < maxChecks; index += 1) {
    const candidate = rerankedCandidates[index]
    const decision = await verifyCandidateMatchesVibe(userText, candidate, modelChain)

    if (decision === true) {
      return { artwork: candidate, rerankApplied, visualCheckPassed: true }
    }

    if (decision === null) {
      return { artwork: bestTextRerank, rerankApplied, visualCheckPassed: null }
    }
  }

  return { artwork: bestTextRerank, rerankApplied, visualCheckPassed: false }
}

async function requestGeminiArtworkResponse(
  userText: string,
  artwork: MuseumArtwork,
  oracleVoice: OracleVoice,
  visualAnalysisEnabled: boolean,
  modelChain?: readonly string[],
): Promise<{
  text: string
  visualAnalysisUsed: boolean
  modelUsed: string
}> {
  const image = visualAnalysisEnabled ? await fetchArtworkImageForGemini(artwork) : null
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

${getVoicePrompt(oracleVoice)}${image ? getVisualAnalysisInstructions() : ""}`

  const { text, modelUsed } = await requestGeminiText(
    geminiPrompt,
    0.7,
    image || undefined,
    modelChain,
  )

  return {
    text,
    visualAnalysisUsed: Boolean(image),
    modelUsed,
  }
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
      visualAnalysisEnabled?: unknown
      selectionStrictness?: unknown
      artworkTypeFilters?: unknown
      geminiTextModelChain?: unknown
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
    const visualAnalysisEnabled = isVisualAnalysisEnabled(body.visualAnalysisEnabled)
    const selectionStrictness = getSelectionStrictness(body.selectionStrictness)
    const artworkTypeFilters: ArtworkTypeFilter[] = sanitizeArtworkTypeFilters(body.artworkTypeFilters)
    const sanitizedGeminiChain: GeminiTextModel[] | null = sanitizeGeminiTextChain(
      body.geminiTextModelChain,
    )
    const geminiTextModelChain = sanitizedGeminiChain ?? undefined
    const baseSearchIntent =
      clientSearchKeywords.length > 0
        ? buildIntentFromKeywords(clientSearchKeywords, userText)
        : await buildSearchIntent(userText, geminiTextModelChain)
    const searchIntent = applySelectionStrictnessToIntent(baseSearchIntent, selectionStrictness)
    const searchKeywords = searchIntent.searchTerms
    const artworkCandidates = await fetchArtworkCandidatesFromMuseums(
      searchIntent,
      {
        recentArtworkIds: Array.from(new Set([...clientRecentArtworkIds, ...recentArtworkIds])),
        recentArtworkSignatures: Array.from(
          new Set([...clientRecentArtworkSignatures, ...recentArtworkSignatures]),
        ),
      },
      selectionStrictness,
      artworkTypeFilters,
      ARTWORK_CANDIDATE_LIMIT,
    )
    const vibeSelection = await selectArtworkByVibe(
      userText,
      artworkCandidates,
      visualAnalysisEnabled,
      geminiTextModelChain,
    )
    const artwork = vibeSelection.artwork
    rememberArtworkId(artwork.id)
    rememberArtworkSignature(artwork)

    const geminiArtworkResponse = await requestGeminiArtworkResponse(
      userText,
      artwork,
      oracleVoice,
      visualAnalysisEnabled,
      geminiTextModelChain,
    )

    return NextResponse.json({
      imageUrl: artwork.imageUrl,
      fullImageUrl: artwork.fullImageUrl || artwork.imageUrl,
      fallbackImageUrl: artwork.fallbackImageUrl || "",
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year,
      therapistText: geminiArtworkResponse.text,
      searchKeywords,
      visualAnalysisRequested: visualAnalysisEnabled,
      visualAnalysisUsed: geminiArtworkResponse.visualAnalysisUsed,
      geminiTextModel: geminiArtworkResponse.modelUsed,
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
