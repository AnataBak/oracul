export const GEMINI_TEXT_MODEL_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
] as const

export const GEMINI_TRANSLATE_MODEL_CHAIN = [
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
] as const

export type GeminiTextModel = (typeof GEMINI_TEXT_MODEL_CHAIN)[number]

export function isGeminiTextModel(value: unknown): value is GeminiTextModel {
  return typeof value === "string" && (GEMINI_TEXT_MODEL_CHAIN as readonly string[]).includes(value)
}

export function sanitizeGeminiTextChain(value: unknown): GeminiTextModel[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const seen = new Set<string>()
  const sanitized: GeminiTextModel[] = []

  for (const entry of value) {
    if (isGeminiTextModel(entry) && !seen.has(entry)) {
      seen.add(entry)
      sanitized.push(entry)
    }
  }

  if (sanitized.length === 0) {
    return null
  }

  for (const fallback of GEMINI_TEXT_MODEL_CHAIN) {
    if (!seen.has(fallback)) {
      sanitized.push(fallback)
    }
  }

  return sanitized
}
