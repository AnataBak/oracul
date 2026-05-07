export const GEMINI_TTS_MODEL_CHAIN = [
  "gemini-2.5-flash-preview-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-pro-preview-tts",
] as const

export type GeminiTtsModel = (typeof GEMINI_TTS_MODEL_CHAIN)[number]

export function isGeminiTtsModel(value: unknown): value is GeminiTtsModel {
  return typeof value === "string" && (GEMINI_TTS_MODEL_CHAIN as readonly string[]).includes(value)
}

export function sanitizeGeminiTtsChain(value: unknown): GeminiTtsModel[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const seen = new Set<string>()
  const sanitized: GeminiTtsModel[] = []

  for (const entry of value) {
    if (isGeminiTtsModel(entry) && !seen.has(entry)) {
      seen.add(entry)
      sanitized.push(entry)
    }
  }

  if (sanitized.length === 0) {
    return null
  }

  for (const fallback of GEMINI_TTS_MODEL_CHAIN) {
    if (!seen.has(fallback)) {
      sanitized.push(fallback)
    }
  }

  return sanitized
}
