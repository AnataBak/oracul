import { NextResponse } from "next/server"
import { requestGeminiTTS } from "../gemini-tts"

export const runtime = "nodejs"

const MAX_TEXT_LENGTH = 4000

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error"
}

function sanitizeForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set")
    }

    const body = (await request.json()) as {
      text?: string
      voice?: string
    }

    const rawText = body.text

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    const cleanedText = sanitizeForSpeech(rawText)

    if (!cleanedText) {
      return NextResponse.json({ error: "text is empty" }, { status: 400 })
    }

    if (cleanedText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `text is too long (max ${MAX_TEXT_LENGTH} characters)` },
        { status: 400 },
      )
    }

    const voiceName = typeof body.voice === "string" && body.voice.trim().length > 0
      ? body.voice.trim()
      : undefined

    const result = await requestGeminiTTS(cleanedText, voiceName)
    const arrayBuffer = result.buffer.buffer.slice(
      result.buffer.byteOffset,
      result.buffer.byteOffset + result.buffer.byteLength,
    ) as ArrayBuffer

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Length": String(result.buffer.byteLength),
        "Cache-Control": "no-store",
        "X-Gemini-Model": result.modelUsed,
      },
    })
  } catch (error) {
    console.error("Error in /api/tts:", error)

    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 },
    )
  }
}
