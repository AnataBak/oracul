import { NextResponse } from "next/server"
import { requestGeminiText } from "../gemini"

export const runtime = "nodejs"

type MuseumInfoPayload = {
  source: string
  artworkId: string
  dateDisplay: string | null
  placeOfOrigin: string | null
  mediumDisplay: string | null
  dimensions: string | null
  creditLine: string | null
  shortDescription: string | null
  description: string | null
  publicationHistory: string | null
  artworkUrl: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error"
}

function extractJsonObject(value: string): string {
  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i)

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const startIndex = value.indexOf("{")
  const endIndex = value.lastIndexOf("}")

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Translation model did not return JSON")
  }

  return value.slice(startIndex, endIndex + 1)
}

async function requestGeminiTranslation(museumInfo: MuseumInfoPayload): Promise<MuseumInfoPayload> {
  const prompt = `Переведи на русский язык только текстовые поля музейной карточки. Сохрани JSON-структуру и ключи без изменений. Не добавляй новых полей, не удаляй поля, не пиши пояснения вне JSON. Если поле уже выглядит как русский текст или равно null, оставь его как есть.

JSON:
${JSON.stringify(museumInfo)}`

  const content = await requestGeminiText(prompt, 0.1)

  return JSON.parse(extractJsonObject(content)) as MuseumInfoPayload
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set")
    }

    const body = (await request.json()) as {
      museumInfo?: MuseumInfoPayload
    }

    if (!body.museumInfo) {
      return NextResponse.json({ error: "museumInfo is required" }, { status: 400 })
    }

    const translatedMuseumInfo = await requestGeminiTranslation(body.museumInfo)

    return NextResponse.json({ museumInfo: translatedMuseumInfo })
  } catch (error) {
    console.error("Error in /api/translate-museum:", error)

    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 },
    )
  }
}
